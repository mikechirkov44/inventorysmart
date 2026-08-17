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
const JobPosition = require('../models/jobPosition');
const KpiIndicator = require('../models/kpiIndicator');
const { evaluate: evaluateKpi } = require('../utils/kpiFormula');
const { getWorkStartDate, startOfDay } = require('../utils/workDue');
const {
  parsePeriodQuery,
  generateCalendarDues,
  getCompletionsForAssignment,
  classifyDueOccurrence,
  aggregateOccurrences,
  addDays,
} = require('../utils/periodAnalytics');

/**
 * Рассчитывает аналитические данные по сотрудникам за период.
 * @async
 * @param {string} companyId
 * @param {string} [fromStr]
 * @param {string} [toStr]
 * @returns {Promise<{ period: { from: string, to: string }, employees: Array }>}
 */
async function getAnalytics(companyId, fromStr, toStr) {
  const { from, to } = parsePeriodQuery(fromStr, toStr);
  const today = startOfDay(new Date());

  const allEquipment = await Equipment.findAll(companyId);
  const allWorks = await Work.findAll(companyId);
  const allWorkOrders = await WorkOrder.findAll(companyId);
  const allRooms = await Room.findAll(companyId);
  const allEmployees = await Employee.findAll(companyId);
  const positions = await JobPosition.findAll(companyId);
  const indicatorMonth = `${from.toISOString().slice(0, 7)}-01`;
  const indicators = await KpiIndicator.findAll(companyId, indicatorMonth);
  const customValues = Object.fromEntries(indicators.map((item) => [`custom:${item.id}`, item.actualValue]));
  const positionMap = Object.fromEntries(positions.map((position) => [position.id, position]));

  const workMap = {};
  allWorks.forEach((work) => { workMap[work.id] = work; });

  const roomMap = {};
  allRooms.forEach((room) => { roomMap[room.id] = room; });

  const employeeStats = {};

  allEmployees.forEach((emp) => {
    employeeStats[emp.id] = {
      employeeId: emp.id,
      employeeName: `${emp.lastName} ${emp.firstName}`,
      position: emp.jobTitle || '',
      jobTitle: emp.jobTitle || '',
      jobPositionId: emp.jobPositionId,
      totalPlanned: 0,
      totalCompleted: 0,
      onTime: 0,
      overdue: 0,
      completedLate: 0,
      neverCompleted: 0,
      avgDaysEarly: 0,
      avgDaysLate: 0,
      completionRate: 0,
      equipment: [],
    };
  });

  allEquipment.forEach((equip) => {
    if (equip.status === 'reserve') return;

    const room = equip.roomId ? roomMap[equip.roomId] : null;
    const employeeId = room ? room.responsibleEmployeeId : null;
    if (!employeeId || !employeeStats[employeeId]) return;

    let workIds = equip.workIds || [];
    if (!Array.isArray(workIds)) workIds = [];

    const equipOrders = allWorkOrders.filter((order) => order.equipmentId === equip.id);
    const equipInfo = {
      equipmentId: equip.id,
      equipmentName: equip.name,
      inventoryNumber: equip.inventoryNumber,
      tasks: [],
    };

    workIds.forEach((workId) => {
      const work = workMap[workId];
      if (!work) return;

      const startDate = getWorkStartDate(equip, workId) || from.toISOString().slice(0, 10);
      const completions = getCompletionsForAssignment(equipOrders, workId);
      const everCompleted = completions.length > 0;
      const frequencyDays = work.frequencyDays || 30;
      const dues = generateCalendarDues(startDate, frequencyDays, from, to);

      const occurrences = dues.map((due, index) => {
        const prevDue = index > 0 ? dues[index - 1] : null;
        const nextDue = index < dues.length - 1 ? dues[index + 1] : addDays(due, frequencyDays);
        const status = classifyDueOccurrence(
          due,
          nextDue,
          prevDue,
          startDate,
          completions,
          today,
          everCompleted,
        );
        return { due, status };
      });

      const taskStats = aggregateOccurrences(occurrences, to, today);
      const stats = employeeStats[employeeId];

      stats.totalPlanned += taskStats.totalPlanned;
      stats.totalCompleted += taskStats.totalCompleted;
      stats.onTime += taskStats.onTime;
      stats.overdue += taskStats.overdue;
      stats.completedLate += taskStats.completedLate;
      stats.neverCompleted += taskStats.neverCompleted;

      equipInfo.tasks.push({
        workId: work.id,
        workName: work.name,
        frequencyDays,
        totalPlanned: taskStats.totalPlanned,
        totalCompleted: taskStats.totalCompleted,
        onTime: taskStats.onTime,
        overdue: taskStats.overdue,
        completedLate: taskStats.completedLate,
        neverCompleted: taskStats.neverCompleted,
        completionRate: taskStats.completionRate,
        completedCount: completions.length,
      });
    });

    if (equipInfo.tasks.length > 0 && employeeStats[employeeId]) {
      employeeStats[employeeId].equipment.push(equipInfo);
    }
  });

  const employees = Object.values(employeeStats).map((stats) => {
    const duePassed = stats.totalCompleted + stats.overdue + stats.neverCompleted;
    const position = positionMap[stats.jobPositionId];
    return {
      ...stats,
      completionRate: duePassed > 0
        ? Math.round((stats.totalCompleted / duePassed) * 100)
        : 0,
      kpi: position ? evaluateKpi(position.kpiConfig, { ...stats, duePassed, ...customValues }) : null,
    };
  });

  return {
    period: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    employees,
    indicators,
  };
}

function buildSummary(employees) {
  const totalPlanned = employees.reduce((sum, emp) => sum + emp.totalPlanned, 0);
  const totalCompleted = employees.reduce((sum, emp) => sum + emp.totalCompleted, 0);
  const totalOnTime = employees.reduce((sum, emp) => sum + emp.onTime, 0);
  const totalOverdue = employees.reduce((sum, emp) => sum + emp.overdue, 0);
  const totalNever = employees.reduce((sum, emp) => sum + emp.neverCompleted, 0);
  const totalLate = employees.reduce((sum, emp) => sum + emp.completedLate, 0);
  const duePassed = totalCompleted + totalOverdue + totalNever;

  return {
    totalPlanned,
    totalCompleted,
    totalOnTime,
    totalOverdue,
    totalNever,
    totalLate,
    completionRate: duePassed > 0 ? Math.round((totalCompleted / duePassed) * 100) : 0,
    employees: employees.length,
  };
}

/**
 * @route GET /analytics
 * @description Получение аналитики по сотрудникам за период
 * @query {string} [from] - Начало периода (YYYY-MM-DD)
 * @query {string} [to] - Конец периода (YYYY-MM-DD)
 */
router.get('/', requirePermission('analytics', 'view'), async (req, res) => {
  try {
    const result = await getAnalytics(req.user.companyId, req.query.from, req.query.to);
    res.json(result);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /analytics/summary
 * @description Сводная аналитика за период
 */
router.get('/summary', requirePermission('analytics', 'view'), async (req, res) => {
  try {
    const result = await getAnalytics(req.user.companyId, req.query.from, req.query.to);
    res.json({
      period: result.period,
      ...buildSummary(result.employees),
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /analytics/incidents
 * @description Аналитика по инцидентам и RCA за период
 */
router.get('/incidents', requirePermission('analytics', 'view'), async (req, res) => {
  try {
    const { getIncidentAnalytics } = require('../utils/incidentAnalytics');
    const result = await getIncidentAnalytics(req.user.companyId, req.query.from, req.query.to);
    res.json(result);
  } catch (error) {
    console.error('Incident analytics error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
