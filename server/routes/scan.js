const express = require('express');
const router = express.Router();
const Equipment = require('../models/equipment');
const WorkOrder = require('../models/workOrder');
const Work = require('../models/work');
const Room = require('../models/room');
const Employee = require('../models/employee');

router.get('/:code', async (req, res) => {
  try {
    const code = req.params.code;
    let equipment = await Equipment.findByQrCode(code);
    if (!equipment) equipment = await Equipment.findById(code);
    if (!equipment) {
      const all = await Equipment.findAll();
      equipment = all.find(e => e.inventoryNumber === code);
    }
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    let room = null;
    let responsibleEmployee = null;
    if (equipment.roomId) {
      room = await Room.findById(equipment.roomId);
      if (room && room.responsibleEmployeeId) {
        responsibleEmployee = await Employee.findById(room.responsibleEmployeeId);
      }
    }

    const allWorks = await Work.findAll();
    const workMap = {};
    allWorks.forEach(w => { workMap[w.id] = w; });

    const workOrders = await WorkOrder.findByEquipmentId(equipment.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let workIds = equipment.workIds || [];
    if (!Array.isArray(workIds)) workIds = [];
    const dueTasks = [];
    const notDueTasks = [];

    workIds.forEach(wid => {
      const work = workMap[wid];
      if (!work) return;

      const completedOrders = workOrders
        .filter(wo => wo.taskId === wid && wo.status === 'completed' && wo.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      const lastCompleted = completedOrders.length > 0 ? new Date(completedOrders[0].completedAt) : null;

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

router.post('/complete', async (req, res) => {
  try {
    const { equipmentId, workId, masterName, notes } = req.body;

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const allWorks = await Work.findAll();
    const work = allWorks.find(w => w.id === workId);
    const taskName = work ? work.name : workId;

    const workOrder = await WorkOrder.create({
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
