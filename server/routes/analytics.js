const express = require('express');
const router = express.Router();
const Equipment = require('../models/equipment');
const Work = require('../models/work');
const WorkOrder = require('../models/workOrder');
const Room = require('../models/room');
const Employee = require('../models/employee');

function getAnalytics() {
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employeeStats = {};

  allEmployees.forEach(emp => {
    employeeStats[emp.id] = {
      employeeId: emp.id,
      employeeName: `${emp.lastName} ${emp.firstName}`,
      position: emp.position || '',
      totalPlanned: 0,
      totalCompleted: 0,
      onTime: 0,
      overdue: 0,
      neverCompleted: 0,
      avgDaysEarly: 0,
      avgDaysLate: 0,
      equipment: [],
    };
  });

  allEquipment.forEach(equip => {
    const room = equip.roomId ? roomMap[equip.roomId] : null;
    const employeeId = room ? room.responsibleEmployeeId : null;
    if (!employeeId || !employeeStats[employeeId]) return;

    let workIds = equip.workIds || [];
    if (typeof workIds === 'string') { try { workIds = JSON.parse(workIds); } catch (_) { workIds = []; } }
    if (!Array.isArray(workIds)) workIds = [];

    const equipOrders = allWorkOrders.filter(wo => wo.equipmentId === equip.id);

    const equipInfo = {
      equipmentId: equip.id,
      equipmentName: equip.name,
      inventoryNumber: equip.inventoryNumber,
      tasks: [],
    };

    workIds.forEach(wid => {
      const work = workMap[wid];
      if (!work) return;

      const completedOrders = equipOrders
        .filter(wo => wo.taskId === wid && wo.status === 'completed' && wo.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      const lastCompleted = completedOrders.length > 0 ? new Date(completedOrders[0].completedAt) : null;

      let nextDue = null;
      if (lastCompleted) {
        nextDue = new Date(lastCompleted);
        nextDue.setDate(nextDue.getDate() + (work.frequencyDays || 30));
        nextDue.setHours(0, 0, 0, 0);
      }

      const isOverdue = nextDue ? today >= nextDue : true;

      let plannedDate = null;
      if (lastCompleted) {
        plannedDate = new Date(lastCompleted);
        plannedDate.setDate(plannedDate.getDate() + (work.frequencyDays || 30));
        plannedDate.setHours(0, 0, 0, 0);
      }

      let daysDiff = null;
      if (lastCompleted && plannedDate) {
        daysDiff = Math.round((lastCompleted - plannedDate) / 86400000);
      }

      const stats = employeeStats[employeeId];
      stats.totalPlanned++;

      if (completedOrders.length > 0) {
        stats.totalCompleted++;
        if (daysDiff !== null) {
          if (daysDiff <= 0) {
            stats.onTime++;
            stats.avgDaysEarly += Math.abs(daysDiff);
          } else {
            stats.overdue++;
            stats.avgDaysLate += daysDiff;
          }
        } else {
          stats.onTime++;
        }
      } else {
        stats.neverCompleted++;
      }

      equipInfo.tasks.push({
        workId: work.id,
        workName: work.name,
        frequencyDays: work.frequencyDays,
        lastCompleted: lastCompleted ? lastCompleted.toISOString() : null,
        plannedDate: plannedDate ? plannedDate.toISOString() : null,
        isOverdue,
        daysDiff,
        completedCount: completedOrders.length,
      });
    });

    if (equipInfo.tasks.length > 0) {
      stats.equipment.push(equipInfo);
    }
  });

  Object.values(employeeStats).forEach(stats => {
    if (stats.totalCompleted > 0) {
      stats.avgDaysEarly = Math.round(stats.avgDaysEarly / stats.totalCompleted * 10) / 10;
      stats.avgDaysLate = Math.round(stats.avgDaysLate / stats.totalCompleted * 10) / 10;
    }
    stats.completionRate = stats.totalPlanned > 0
      ? Math.round(stats.totalCompleted / stats.totalPlanned * 100)
      : 0;
  });

  return Object.values(employeeStats);
}

// GET /api/analytics
router.get('/', (req, res) => {
  try {
    const analytics = getAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/summary
router.get('/summary', (req, res) => {
  try {
    const analytics = getAnalytics();
    const totalPlanned = analytics.reduce((s, e) => s + e.totalPlanned, 0);
    const totalCompleted = analytics.reduce((s, e) => s + e.totalCompleted, 0);
    const totalOnTime = analytics.reduce((s, e) => s + e.onTime, 0);
    const totalOverdue = analytics.reduce((s, e) => s + e.overdue, 0);
    const totalNever = analytics.reduce((s, e) => s + e.neverCompleted, 0);

    res.json({
      totalPlanned,
      totalCompleted,
      totalOnTime,
      totalOverdue,
      totalNever,
      completionRate: totalPlanned > 0 ? Math.round(totalCompleted / totalPlanned * 100) : 0,
      employees: analytics.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
