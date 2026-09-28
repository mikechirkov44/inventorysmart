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
