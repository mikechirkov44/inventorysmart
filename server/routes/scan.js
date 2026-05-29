const express = require('express');
const router = express.Router();
const Equipment = require('../models/equipment');
const WorkOrder = require('../models/workOrder');
const Work = require('../models/work');
const Room = require('../models/room');
const Employee = require('../models/employee');

// GET scan - find equipment and calculate tasks due today
router.get('/:code', (req, res) => {
  try {
    const code = req.params.code;
    let equipment = Equipment.findByQrCode(code);
    if (!equipment) equipment = Equipment.findById(code);
    if (!equipment) {
      const all = Equipment.findAll();
      equipment = all.find(e => e.inventoryNumber === code);
    }
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // Room & responsible employee
    let room = null;
    let responsibleEmployee = null;
    if (equipment.roomId) {
      room = Room.findById(equipment.roomId);
      if (room && room.responsibleEmployeeId) {
        responsibleEmployee = Employee.findById(room.responsibleEmployeeId);
      }
    }

    // All works from directory
    const allWorks = Work.findAll();
    const workMap = {};
    allWorks.forEach(w => { workMap[w.id] = w; });

    // Work orders for this equipment
    const workOrders = WorkOrder.findByEquipmentId(equipment.id);

    // Calculate due tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let workIds = equipment.workIds || [];
    if (typeof workIds === 'string') {
      try { workIds = JSON.parse(workIds); } catch (_) { workIds = []; }
    }
    if (!Array.isArray(workIds)) workIds = [];
    const dueTasks = [];
    const notDueTasks = [];

    workIds.forEach(wid => {
      const work = workMap[wid];
      if (!work) return;

      // Find last completion for this work+equipment
      const completedOrders = workOrders
        .filter(wo => wo.taskId === wid && wo.status === 'completed' && wo.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      const lastCompleted = completedOrders.length > 0 ? new Date(completedOrders[0].completedAt) : null;

      // Calculate next due date
      let nextDue = null;
      let isOverdue = false;
      let isDueToday = false;

      if (lastCompleted) {
        nextDue = new Date(lastCompleted);
        nextDue.setDate(nextDue.getDate() + (work.frequencyDays || 30));
        nextDue.setHours(0, 0, 0, 0);

        isOverdue = today >= nextDue;
        isDueToday = today.getTime() === nextDue.getTime() ||
          (today > nextDue && today.getTime() - nextDue.getTime() < 86400000);
      } else {
        // Never completed — always due
        isOverdue = true;
        isDueToday = true;
      }

      const entry = {
        workId: work.id,
        name: work.name,
        description: work.description,
        frequencyDays: work.frequencyDays,
        category: work.category,
        lastCompleted: lastCompleted ? lastCompleted.toISOString() : null,
        nextDue: nextDue ? nextDue.toISOString() : null,
        isOverdue,
        completedCount: completedOrders.length,
      };

      if (isOverdue) {
        dueTasks.push(entry);
      } else {
        notDueTasks.push(entry);
      }
    });

    res.json({
      equipment,
      room,
      responsibleEmployee,
      dueTasks,
      notDueTasks,
      completedTotal: workOrders.filter(wo => wo.status === 'completed').length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST complete a task
router.post('/complete', (req, res) => {
  try {
    const { equipmentId, workId, masterName, notes } = req.body;

    const equipment = Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const allWorks = Work.findAll();
    const work = allWorks.find(w => w.id === workId);
    const taskName = work ? work.name : workId;

    const workOrder = WorkOrder.create({
      equipmentId,
      taskId: workId,
      taskName,
      masterName,
      notes,
      status: 'completed'
    });

    res.status(201).json(workOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
