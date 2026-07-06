/**
 * @module Маршруты аналитики
 * @description API для получения аналитических данных по выполнению работ сотрудниками.
 * Предоставляет статистику по запланированным, выполненным, просроченным и незавершённым задачам.
 */

const express = require('express');
const router = express.Router();
const Equipment = require('../models/equipment');
const Work = require('../models/work');
const WorkOrder = require('../models/workOrder');
const Room = require('../models/room');
const Employee = require('../models/employee');
const { requirePermission } = require('../middleware/auth');
const { calculateWorkDue, getWorkStartDate } = require('../utils/workDue');

/**
 * Рассчитывает аналитические данные по сотрудникам и оборудованию.
 * @async
 * @function getAnalytics
 * @returns {Promise<Array>} Массив статистики по каждому сотруднику
 */
async function getAnalytics(companyId) {
  const allEquipment = await Equipment.findAll(companyId);
  const allWorks = await Work.findAll(companyId);
  const allWorkOrders = await WorkOrder.findAll(companyId);
  const allRooms = await Room.findAll(companyId);
  const allEmployees = await Employee.findAll(companyId);

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
      position: emp.jobTitle || '',
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
      const dueInfo = calculateWorkDue({
        frequencyDays: work.frequencyDays || 30,
        lastCompleted,
        startDate: getWorkStartDate(equip, wid),
        today,
      });

      const isOverdue = dueInfo.isOverdue;
      const plannedDate = dueInfo.plannedDate;

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
      } else if (isOverdue) {
        stats.neverCompleted++;
      }

      equipInfo.tasks.push({
        workId: work.id,
        workName: work.name,
        frequencyDays: work.frequencyDays,
        lastCompleted: lastCompleted ? lastCompleted.toISOString() : null,
        plannedDate: plannedDate.toISOString(),
        isOverdue,
        daysDiff,
        completedCount: completedOrders.length,
      });
    });

    if (equipInfo.tasks.length > 0 && employeeStats[employeeId]) {
      employeeStats[employeeId].equipment.push(equipInfo);
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

/**
 * @route GET /analytics
 * @description Получение полной аналитики по всем сотрудникам
 * @returns {Object[]} Список сотрудников с детальной статистикой выполнения работ
 * @returns {number} return[].employeeId - Идентификатор сотрудника
 * @returns {string} return[].employeeName - ФИО сотрудника
 * @returns {number} return[].totalPlanned - Общее количество запланированных работ
 * @returns {number} return[].totalCompleted - Количество выполненных работ
 * @returns {number} return[].onTime - Количество работ, выполненных в срок
 * @returns {number} return[].overdue - Количество просроченных работ
 * @returns {number} return[].completionRate - Процент выполнения
 */
router.get('/', requirePermission('analytics', 'view'), async (req, res) => {
  try {
    const analytics = await getAnalytics(req.user.companyId);
    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /analytics/summary
 * @description Получение сводной аналитики по всем сотрудникам
 * @returns {Object} Сводные данные
 * @returns {number} return.totalPlanned - Общее количество запланированных работ
 * @returns {number} return.totalCompleted - Общее количество выполненных работ
 * @returns {number} return.totalOnTime - Общее количество работ в срок
 * @returns {number} return.totalOverdue - Общее количество просроченных работ
 * @returns {number} return.totalNever - Работы, которые никогда не выполнялись
 * @returns {number} return.completionRate - Общий процент выполнения
 * @returns {number} return.employees - Количество сотрудников
 */
router.get('/summary', requirePermission('analytics', 'view'), async (req, res) => {
  try {
    const analytics = await getAnalytics(req.user.companyId);
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
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
