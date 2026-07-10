/**
 * @module workDue
 * @description Расчёт сроков плановых работ с учётом даты старта привязки
 */

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return startOfDay(result);
}

/** @returns {string} YYYY-MM-DD в локальной дате */
function toDateKey(value) {
  const date = startOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** @param {string} key YYYY-MM-DD */
function fromDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return startOfDay(new Date(year, month - 1, day));
}

/**
 * Все плановые даты повторяющейся работы в полуинтервале [rangeStart, rangeEnd).
 * Логика совпадает с диаграммой Ганта в план-графике.
 * @returns {string[]} Отсортированные ключи YYYY-MM-DD
 */
function getPlannedOccurrenceKeys(baseDate, frequencyDays, rangeStart, rangeEnd) {
  const frequency = frequencyDays > 0 ? frequencyDays : 30;
  const base = startOfDay(baseDate);
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);

  if (frequency <= 0) {
    return base >= start && base < end ? [toDateKey(base)] : [];
  }

  const msPerDay = 86400000;
  const daysDiffFromStart = Math.floor((start.getTime() - base.getTime()) / msPerDay);
  const periodsFromStart = Math.ceil(daysDiffFromStart / frequency);
  let firstAfterStart = addDays(base, periodsFromStart * frequency);
  if (firstAfterStart < start) {
    firstAfterStart = addDays(firstAfterStart, frequency);
  }

  const keys = new Set();

  let current = new Date(firstAfterStart);
  while (current < end) {
    keys.add(toDateKey(current));
    current = addDays(current, frequency);
  }

  let back = addDays(firstAfterStart, -frequency);
  while (back >= start) {
    keys.add(toDateKey(back));
    back = addDays(back, -frequency);
  }

  return [...keys].sort();
}

/**
 * @param {object} params
 * @param {number} [params.frequencyDays=30]
 * @param {Date|string|null} [params.lastCompleted]
 * @param {Date|string|null} [params.startDate]
 * @param {Date} [params.today]
 * @returns {{ plannedDate: Date, nextDue: Date, isOverdue: boolean, isDueToday: boolean, daysOverdue: number, daysUntil: number }}
 */
function calculateWorkDue({
  frequencyDays = 30,
  lastCompleted = null,
  startDate = null,
  today = new Date(),
}) {
  const todayDate = startOfDay(today);
  const frequency = frequencyDays || 30;

  let plannedDate;
  if (lastCompleted) {
    plannedDate = startOfDay(lastCompleted);
    plannedDate.setDate(plannedDate.getDate() + frequency);
  } else {
    plannedDate = startOfDay(startDate || todayDate);
  }

  const nextDue = new Date(plannedDate);
  const isOverdue = todayDate >= nextDue;
  const isDueToday = todayDate.getTime() === nextDue.getTime();
  const daysOverdue = todayDate > nextDue
    ? Math.floor((todayDate - nextDue) / 86400000)
    : 0;
  const daysUntil = todayDate < nextDue
    ? Math.ceil((nextDue - todayDate) / 86400000)
    : 0;

  return { plannedDate, nextDue, isOverdue, isDueToday, daysOverdue, daysUntil };
}

/**
 * @param {object} equipment
 * @param {string} workId
 * @returns {string|null}
 */
function getWorkStartDate(equipment, workId) {
  const links = equipment.workLinks || [];
  const link = links.find((item) => item.workId === workId);
  return link?.startDate || null;
}

/**
 * @param {object} params
 * @param {boolean} params.isOverdue
 * @param {boolean} params.isDueToday
 * @param {number} params.daysUntil
 * @param {Date|string|null} params.lastCompleted
 * @returns {'overdue'|'never'|'upcoming'|'planned'|'today'}
 */
function resolveScheduleStatus({ isOverdue, isDueToday, daysUntil, lastCompleted }) {
  if (isOverdue && lastCompleted) return 'overdue';
  if (isOverdue && !lastCompleted) return isDueToday ? 'today' : 'never';
  if (!isOverdue && lastCompleted && daysUntil <= 7) return 'upcoming';
  if (!isOverdue && !lastCompleted && daysUntil <= 7 && daysUntil > 0) return 'upcoming';
  return 'planned';
}

/**
 * На сколько дней последнее выполнение опоздало относительно срока своего цикла.
 * @returns {number|null}
 */
function getLastCompletionDaysLate({
  lastCompleted,
  previousCompleted = null,
  startDate = null,
  frequencyDays = 30,
}) {
  if (!lastCompleted) return null;
  const { nextDue } = calculateWorkDue({
    frequencyDays,
    lastCompleted: previousCompleted,
    startDate,
    today: lastCompleted,
  });
  return Math.round((startOfDay(lastCompleted) - startOfDay(nextDue)) / 86400000);
}

/** Текст просрочки для уведомлений. */
function formatOverdueLabel(daysOverdue) {
  if (daysOverdue <= 0) return 'срок сегодня';
  return `просрочено на ${daysOverdue} дн.`;
}

module.exports = {
  startOfDay,
  addDays,
  toDateKey,
  fromDateKey,
  getPlannedOccurrenceKeys,
  calculateWorkDue,
  getWorkStartDate,
  resolveScheduleStatus,
  getLastCompletionDaysLate,
  formatOverdueLabel,
};
