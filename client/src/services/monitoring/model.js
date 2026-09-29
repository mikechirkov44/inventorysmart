export const MONITORING_STATES = {
  working: { label: 'Работа', className: 'monitor-working' },
  idle: { label: 'Простой', className: 'monitor-idle' },
  off: { label: 'Выключено', className: 'monitor-off' },
  fault: { label: 'Авария', className: 'monitor-fault' },
  unknown: { label: 'Нет данных', className: 'monitor-unknown' },
};
export const MONITORING_TIMEZONE = 'Europe/Moscow';
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function shiftDate(value, days) {
  if (!validDate(value)) throw new Error('Некорректная дата');
  const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function monitoringToday(now = new Date()) {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function dateRange(from, to) {
  if (!validDate(from) || !validDate(to) || from > to) throw new Error('Укажите корректный период');
  const length = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  if (length > 31) throw new Error('Выберите период не больше 31 дня');
  return Array.from({ length }, (_, i) => shiftDate(from, i));
}
export const displayDate = value => validDate(value) ? `${value.slice(8, 10)}.${value.slice(5, 7)}` : '—';
export const minutesLabel = minutes => `${Math.floor(minutes / 60)} ч ${Math.round(minutes % 60)} мин`;
export const timeLabel = minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export const loadLabel = value => value == null ? 'Нет данных' : `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;
export function hoursLabel(minutes) {
  const hours = Math.round((Number(minutes) || 0) / 60 * 10) / 10;
  return `${hours.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ч`;
}
export function summarizeTimeFund(days = []) {
  const minutes = { working: 0, idle: 0, off: 0, fault: 0, unknown: 0 };
  let elapsedMinutes = 0;
  for (const day of days) {
    if (!day) continue;
    elapsedMinutes += day.elapsedMinutes || 0;
    for (const state of Object.keys(minutes)) minutes[state] += day.minutes?.[state] || 0;
  }
  const known = elapsedMinutes - minutes.unknown;
  const ready = minutes.working + minutes.idle + minutes.off;
  return {
    minutes,
    elapsedMinutes,
    poweredMinutes: minutes.working + minutes.idle,
    readiness: known > 0 ? Math.round(ready / known * 1000) / 10 : null,
  };
}
const MODE_KEY = 'monitoring-view';
export function readMonitoringMode() {
  try { return localStorage.getItem(MODE_KEY) === 'shift' ? 'shift' : 'day'; } catch { return 'day'; }
}
export function writeMonitoringMode(mode) {
  const next = mode === 'shift' ? 'shift' : 'day';
  try { localStorage.setItem(MODE_KEY, next); } catch { /* ignore */ }
  window.dispatchEvent(new Event('monitoring-mode'));
  return next;
}
export function isHourUnit(unit) {
  const text = String(unit || '').trim().toLowerCase().replace(/\.$/, '');
  if (!text) return false;
  if (/^(ч|час|часа|часов|моточас|моточаса|моточасов|моточасы|h|hr|hrs|hour|hours)$/i.test(text)) return true;
  if (text.includes('моточас') || text.includes('м/ч')) return true;
  return /(^|[^a-zа-яё])час(а|ов|ы)?(?![a-zа-яё])/i.test(text);
}
