/**
 * @module periodAnalytics
 * @description Расчёт аналитики выполнения работ за выбранный период
 */

const { startOfDay } = require('./workDue');

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

/**
 * @param {string|undefined} fromStr
 * @param {string|undefined} toStr
 * @returns {{ from: Date, to: Date }}
 */
function parsePeriodQuery(fromStr, toStr) {
  const today = startOfDay(new Date());

  let from;
  let to;

  if (fromStr && toStr) {
    from = startOfDay(fromStr);
    to = startOfDay(toStr);
  } else {
    from = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    to = startOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  }

  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }

  return { from, to };
}

/**
 * Календарные сроки выполнения в периоде от даты старта привязки.
 * @param {Date|string} anchorDate
 * @param {number} frequencyDays
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @returns {Date[]}
 */
function generateCalendarDues(anchorDate, frequencyDays, periodStart, periodEnd) {
  const anchor = startOfDay(anchorDate);
  const periodStartDay = startOfDay(periodStart);
  const periodEndDay = startOfDay(periodEnd);
  const frequency = frequencyDays || 30;

  const dues = [];
  let due = anchor;
  let guard = 0;

  while (due < periodStartDay && guard++ < 10000) {
    due = addDays(due, frequency);
  }

  guard = 0;
  while (due <= periodEndDay && guard++ < 10000) {
    if (due >= anchor) {
      dues.push(new Date(due));
    }
    due = addDays(due, frequency);
  }

  return dues;
}

/**
 * @param {Array} workOrders
 * @param {string} taskId
 * @returns {Date[]}
 */
function getCompletionsForAssignment(workOrders, taskId) {
  return workOrders
    .filter((order) => order.taskId === taskId && order.status === 'completed' && order.completedAt)
    .map((order) => startOfDay(order.completedAt))
    .sort((a, b) => a - b);
}

/**
 * @param {Date} dueDate
 * @param {Date|null} nextDueDate
 * @param {Date|null} prevDueDate
 * @param {string|null} startDate
 * @param {Date[]} completions
 * @param {Date} today
 * @param {boolean} everCompleted
 * @returns {'onTime'|'late'|'overdue'|'never'|'planned'}
 */
function classifyDueOccurrence(
  dueDate,
  nextDueDate,
  prevDueDate,
  startDate,
  completions,
  today,
  everCompleted,
) {
  const due = startOfDay(dueDate);
  const todayDay = startOfDay(today);
  const prev = prevDueDate ? startOfDay(prevDueDate) : null;
  const next = nextDueDate ? startOfDay(nextDueDate) : null;
  const start = startDate ? startOfDay(startDate) : null;

  const inCycle = completions.filter((completedAt) => {
    const afterPrev = !prev || completedAt.getTime() > prev.getTime();
    const beforeNext = !next || completedAt.getTime() < next.getTime();
    const afterStart = !start || completedAt.getTime() >= start.getTime();
    return afterPrev && beforeNext && afterStart;
  });

  const onTime = inCycle.find((completedAt) => completedAt.getTime() <= due.getTime());
  if (onTime) return 'onTime';

  const late = inCycle.find((completedAt) => completedAt.getTime() > due.getTime());
  if (late) return 'late';

  if (due.getTime() <= todayDay.getTime()) {
    return everCompleted ? 'overdue' : 'never';
  }

  return 'planned';
}

/**
 * @param {Array<{ due: Date, status: string }>} occurrences
 * @param {Date} periodEnd
 * @param {Date} today
 */
function aggregateOccurrences(occurrences, periodEnd, today) {
  const cutoff = startOfDay(today) <= startOfDay(periodEnd)
    ? startOfDay(today)
    : startOfDay(periodEnd);

  const stats = {
    totalPlanned: occurrences.length,
    totalCompleted: 0,
    onTime: 0,
    overdue: 0,
    completedLate: 0,
    neverCompleted: 0,
    avgDaysEarly: 0,
    avgDaysLate: 0,
  };

  let earlySum = 0;
  let lateSum = 0;

  occurrences.forEach(({ due, status }) => {
    if (due.getTime() > cutoff.getTime()) return;

    if (status === 'onTime') {
      stats.totalCompleted += 1;
      stats.onTime += 1;
    } else if (status === 'late') {
      stats.totalCompleted += 1;
      stats.completedLate += 1;
    } else if (status === 'overdue') {
      stats.overdue += 1;
    } else if (status === 'never') {
      stats.neverCompleted += 1;
    }
  });

  const duePassed = occurrences.filter(({ due }) => due.getTime() <= cutoff.getTime()).length;
  stats.completionRate = duePassed > 0
    ? Math.round((stats.totalCompleted / duePassed) * 100)
    : 0;

  if (stats.totalCompleted > 0) {
    stats.avgDaysEarly = Math.round((earlySum / stats.totalCompleted) * 10) / 10;
    stats.avgDaysLate = Math.round((lateSum / stats.totalCompleted) * 10) / 10;
  }

  return stats;
}

module.exports = {
  addDays,
  parsePeriodQuery,
  generateCalendarDues,
  getCompletionsForAssignment,
  classifyDueOccurrence,
  aggregateOccurrences,
};
