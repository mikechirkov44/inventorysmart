const express = require('express');
const router = express.Router();
const Equipment = require('../models/equipment');
const Work = require('../models/work');
const WorkOrder = require('../models/workOrder');
const Room = require('../models/room');
const Employee = require('../models/employee');

// GET /api/schedule?group=employee|equipment|month
router.get('/', (req, res) => {
  try {
    const groupBy = req.query.group || 'employee';
    const allEquipment = Equipment.findAll();
    const allWorks = Work.findAll();
    const allWorkOrders = WorkOrder.findAll();
    const allRooms = Room.findAll();
    const allEmployees = Employee.findAll();

    const workMap = {};
    allWorks.forEach(w => { workMap[w.id] = w; });
    const roomMap = {};
    allRooms.forEach(r => { roomMap[r.id] = r; });
    const empMap = {};
    allEmployees.forEach(e => { empMap[e.id] = e; });
    const eqMap = {};
    allEquipment.forEach(e => { eqMap[e.id] = e; });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = [];

    allEquipment.forEach(equip => {
      const room = equip.roomId ? roomMap[equip.roomId] : null;
      const employee = room && room.responsibleEmployeeId ? empMap[room.responsibleEmployeeId] : null;

      let workIds = equip.workIds || [];
      if (typeof workIds === 'string') { try { workIds = JSON.parse(workIds); } catch (_) { workIds = []; } }
      if (!Array.isArray(workIds)) workIds = [];

      const equipOrders = allWorkOrders.filter(wo => wo.equipmentId === equip.id);

      workIds.forEach(wid => {
        const work = workMap[wid];
        if (!work) return;

        const completedOrders = equipOrders
          .filter(wo => wo.taskId === wid && wo.status === 'completed' && wo.completedAt)
          .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

        const lastCompleted = completedOrders.length > 0 ? new Date(completedOrders[0].completedAt) : null;

        let plannedDate = null;
        let nextDue = null;
        if (lastCompleted) {
          plannedDate = new Date(lastCompleted);
          plannedDate.setDate(plannedDate.getDate() + (work.frequencyDays || 30));
          plannedDate.setHours(0, 0, 0, 0);
          nextDue = new Date(plannedDate);
        }

        const isOverdue = nextDue ? today >= nextDue : true;
        const isPast = nextDue ? nextDue < today : false;

        let status = 'planned';
        if (isOverdue && lastCompleted) status = 'overdue';
        else if (isOverdue && !lastCompleted) status = 'never';
        else status = 'planned';

        if (!isOverdue && lastCompleted) {
          const daysUntil = Math.ceil((nextDue - today) / 86400000);
          if (daysUntil <= 7) status = 'upcoming';
        }

        rows.push({
          id: `${equip.id}-${wid}`,
          equipmentId: equip.id,
          equipmentName: equip.name,
          inventoryNumber: equip.inventoryNumber,
          roomName: room ? room.name : '—',
          employeeId: employee ? employee.id : null,
          employeeName: employee ? `${employee.lastName} ${employee.firstName}` : '—',
          workId: work.id,
          workName: work.name,
          frequencyDays: work.frequencyDays,
          lastCompleted: lastCompleted ? lastCompleted.toISOString() : null,
          plannedDate: plannedDate ? plannedDate.toISOString() : null,
          status,
        });
      });
    });

    let grouped = {};
    if (groupBy === 'employee') {
      rows.forEach(row => {
        const key = row.employeeName;
        if (!grouped[key]) grouped[key] = { label: key, rows: [] };
        grouped[key].rows.push(row);
      });
    } else if (groupBy === 'equipment') {
      rows.forEach(row => {
        const key = row.equipmentName;
        if (!grouped[key]) grouped[key] = { label: key, rows: [] };
        grouped[key].rows.push(row);
      });
    } else if (groupBy === 'month') {
      rows.forEach(row => {
        const date = row.plannedDate ? new Date(row.plannedDate) : null;
        const key = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : 'Без даты';
        const label = date ? `${MONTHS[date.getMonth()]} ${date.getFullYear()}` : 'Без даты';
        if (!grouped[key]) grouped[key] = { label, rows: [], sortKey: key };
        grouped[key].rows.push(row);
      });
    } else {
      grouped = { 'all': { label: 'Все работы', rows } };
    }

    const groups = Object.values(grouped).sort((a, b) => {
      if (a.sortKey && b.sortKey) return a.sortKey.localeCompare(b.sortKey);
      return 0;
    });

    res.json({ rows, groups, total: rows.length });
  } catch (error) {
    console.error('Schedule error:', error);
    res.status(500).json({ error: error.message });
  }
});

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

module.exports = router;
