/**
 * @module workDue
 * @description Расчёт сроков плановых работ с учётом даты старта привязки
 */

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
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

module.exports = {
  startOfDay,
  calculateWorkDue,
  getWorkStartDate,
  resolveScheduleStatus,
};
