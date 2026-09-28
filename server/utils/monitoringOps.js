const PROBLEM_STATES = new Set(['fault', 'unknown']);
const DOWNTIME_STATES = new Set(['idle', 'fault']);
const HOUR_UNITS = new Set([
  'ч', 'час', 'часа', 'часов',
  'моточас', 'моточаса', 'моточасов', 'моточасы',
  'h', 'hr', 'hrs', 'hour', 'hours',
]);

function parseClock(value, fallbackMinutes) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  if (!match) return fallbackMinutes;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return fallbackMinutes;
  return hours * 60 + minutes;
}

function formatClock(minutes) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function shiftRanges(startClock, endClock) {
  const start = parseClock(startClock, 8 * 60);
  const end = parseClock(endClock, 20 * 60);
  if (start === end) return { start, end, ranges: [[0, 1440]] };
  if (end > start) return { start, end, ranges: [[start, end]] };
  return { start, end, ranges: [[start, 1440], [0, end]] };
}

function overlapLength(start, end, from, to) {
  return Math.max(0, Math.min(end, to) - Math.max(start, from));
}

function applyShiftView(day, { start = '08:00', end = '20:00', now = new Date() } = {}) {
  const shift = shiftRanges(start, end);
  const dayStart = Date.parse(`${day.date}T00:00:00+03:00`);
  const today = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const nowMinute = day.date < today ? 1440 : day.date > today ? 0 : Math.max(0, Math.min(1440, Math.round((now.getTime() - dayStart) / 60000)));
  const minutes = { working: 0, idle: 0, off: 0, fault: 0, unknown: 0 };
  const intervals = [];
  for (const interval of day.intervals || []) {
    for (const [from, to] of shift.ranges) {
      const startMinute = Math.max(interval.startMinute, from);
      const endMinute = Math.min(interval.endMinute, to, nowMinute);
      if (endMinute <= startMinute || minutes[interval.state] == null) continue;
      const previous = intervals.at(-1);
      if (previous?.state === interval.state && previous.endMinute === startMinute) previous.endMinute = endMinute;
      else intervals.push({ startMinute, endMinute, state: interval.state });
      minutes[interval.state] += endMinute - startMinute;
    }
  }
  const elapsedMinutes = shift.ranges.reduce((sum, [from, to]) => sum + overlapLength(from, to, 0, nowMinute), 0);
  const known = elapsedMinutes - minutes.unknown;
  return {
    ...day,
    mode: 'shift',
    shiftStart: formatClock(shift.start),
    shiftEnd: formatClock(shift.end),
    intervals,
    minutes,
    elapsedMinutes,
    utilization: elapsedMinutes && known > 0 ? Math.round(minutes.working / elapsedMinutes * 1000) / 10 : null,
  };
}

function planAlert({ previousState, state, alertSince, alertNotified, now, thresholdMinutes }) {
  if (!PROBLEM_STATES.has(state)) {
    return { alertSince: null, alertNotified: false, notify: false, kind: null };
  }
  const continuing = PROBLEM_STATES.has(previousState) && alertSince;
  const since = continuing ? new Date(alertSince) : now;
  const notify = !alertNotified && now.getTime() - since.getTime() >= thresholdMinutes * 60000;
  return {
    alertSince: since,
    alertNotified: Boolean(alertNotified) || notify,
    notify,
    kind: state,
  };
}

function planDowntime({ openState, state }) {
  const actions = [];
  if (openState && openState !== state) actions.push({ type: 'close' });
  if (DOWNTIME_STATES.has(state) && openState !== state) actions.push({ type: 'open', state });
  return actions;
}

function segmentNeedsReason(segment, now, thresholdMinutes) {
  if (!segment || segment.causeId) return false;
  const end = segment.endedAt ? new Date(segment.endedAt).getTime() : now.getTime();
  const start = new Date(segment.startedAt).getTime();
  return Number.isFinite(start) && end - start >= thresholdMinutes * 60000;
}

function isHourUnit(unit) {
  const text = String(unit || '').trim().toLowerCase().replace(/\.$/, '');
  if (!text) return false;
  if (HOUR_UNITS.has(text)) return true;
  if (text.includes('моточас') || text.includes('м/ч')) return true;
  return /(^|[^a-zа-яё])час(а|ов|ы)?(?![a-zа-яё])/i.test(text);
}

function workingHoursDelta({ previousState, gapMs, staleMs }) {
  if (previousState !== 'working' || !(gapMs > 0)) return 0;
  return Math.min(gapMs, Math.max(0, staleMs)) / 3600000;
}

function splitHours(remainder, delta) {
  const total = Number(remainder || 0) + Number(delta || 0);
  const applied = Math.floor(total * 100 + 1e-6) / 100;
  const left = Math.round((total - applied) * 1e6) / 1e6;
  return { applied, remainder: Math.max(0, left) };
}

function offlineMinutes({ state, lastSuccessAt, now }) {
  if (state !== 'unknown' || !lastSuccessAt) return null;
  return Math.max(0, Math.round((now.getTime() - new Date(lastSuccessAt).getTime()) / 60000));
}

function normalizeClock(value) {
  const match = /^(\d{2}):(\d{2})/.exec(String(value || ''));
  return match ? `${match[1]}:${match[2]}` : '';
}

function validateMonitoringPrefs(input = {}) {
  const minutes = Number(input.monitoringAlertMinutes);
  const shiftStart = normalizeClock(input.shiftStart);
  const shiftEnd = normalizeClock(input.shiftEnd);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
    const error = new Error('Порог уведомления должен быть от 1 до 240 минут');
    error.statusCode = 400;
    throw error;
  }
  if (!shiftStart || !shiftEnd) {
    const error = new Error('Укажите время смены в формате ЧЧ:ММ');
    error.statusCode = 400;
    throw error;
  }
  return { monitoringAlertMinutes: minutes, shiftStart, shiftEnd };
}

module.exports = {
  applyShiftView,
  planAlert,
  planDowntime,
  segmentNeedsReason,
  isHourUnit,
  workingHoursDelta,
  splitHours,
  offlineMinutes,
  validateMonitoringPrefs,
};
