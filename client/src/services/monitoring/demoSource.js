import { dateRange, monitoringToday, validDate, MONITORING_TIMEZONE } from './model.js';

function hash(text) {
  let value = 2166136261;
  for (const char of text) { value ^= char.charCodeAt(0); value = Math.imul(value, 16777619); }
  return value >>> 0;
}
function stateAt(equipmentId, date, minute) {
  const profile = hash(equipmentId) % 4;
  const slot = Math.floor(minute / 30);
  const random = hash(`${equipmentId}|${date}|${slot}`) % 100;
  if (hash(`${equipmentId}|${date}`) % 29 === 0) return 'unknown';
  if (slot < 12 || slot >= 44) return profile === 0 && random < 75 ? 'working' : 'off';
  if (random < 4) return 'unknown';
  if (random < 9) return 'fault';
  if (slot === 24 || random < 24 + profile * 6) return 'idle';
  return 'working';
}
function buildDay(equipmentId, date, now) {
  if (!equipmentId || !validDate(date)) throw new Error('Некорректное оборудование или дата');
  const today = monitoringToday(now);
  const elapsedMinutes = date < today ? 1440 : date > today ? 0 : Math.floor((now.getTime() - Date.parse(`${date}T00:00:00+03:00`)) / 60000);
  const intervals = [];
  const minutes = { working: 0, idle: 0, off: 0, fault: 0, unknown: 0 };
  for (let startMinute = 0; startMinute < elapsedMinutes; startMinute += 30) {
    const endMinute = Math.min(startMinute + 30, elapsedMinutes);
    const state = stateAt(equipmentId, date, startMinute);
    const previous = intervals.at(-1);
    if (previous?.state === state) previous.endMinute = endMinute;
    else intervals.push({ startMinute, endMinute, state });
    minutes[state] += endMinute - startMinute;
  }
  return {
    equipmentId, date, source: 'demo', timezone: MONITORING_TIMEZONE, intervals, minutes, elapsedMinutes,
    utilization: elapsedMinutes && minutes.unknown !== elapsedMinutes ? Math.round(minutes.working / elapsedMinutes * 1000) / 10 : null,
  };
}

// Pure demo provider: no writes, no dependence on the equipment's real status.
// A future server-side MTConnect collector can supply this same read model.
export const demoMonitoringSource = {
  id: 'demo', label: 'Демо-данные',
  async getDay(equipmentId, date, now = new Date()) { return buildDay(equipmentId, date, now); },
  async getRange(equipmentIds, from, to, now = new Date()) {
    const dates = dateRange(from, to);
    return equipmentIds.map(equipmentId => ({ equipmentId, days: dates.map(date => buildDay(equipmentId, date, now)) }));
  },
  async getSnapshot(equipmentId, now = new Date()) {
    const day = buildDay(equipmentId, monitoringToday(now), now);
    return { equipmentId, source: 'demo', asOf: now.toISOString(), state: day.intervals.at(-1)?.state || 'unknown' };
  },
};
