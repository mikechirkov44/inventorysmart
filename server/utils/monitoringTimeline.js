const MONITORING_STATES = ['working', 'idle', 'off', 'fault', 'unknown'];
const GATEWAY_VALUE_MAP = { 0: 'off', 1: 'idle', 2: 'working', 3: 'fault' };

function decodeGatewayValue(value) {
  const numeric = Number(value);
  return Object.prototype.hasOwnProperty.call(GATEWAY_VALUE_MAP, numeric)
    ? GATEWAY_VALUE_MAP[numeric]
    : 'unknown';
}

function moscowDayStart(date) {
  return Date.parse(`${date}T00:00:00+03:00`);
}

function minuteOfDay(timestamp, dayStart) {
  return Math.max(0, Math.min(1440, Math.round((timestamp - dayStart) / 60000)));
}

function pushInterval(intervals, minutes, startMinute, endMinute, state) {
  if (endMinute <= startMinute) return;
  const previous = intervals.at(-1);
  if (previous?.state === state && previous.endMinute === startMinute) previous.endMinute = endMinute;
  else intervals.push({ startMinute, endMinute, state });
  minutes[state] += endMinute - startMinute;
}

/**
 * Собирает сутки мониторинга из опросов Modbus.
 * Если между опросами пауза больше двух интервалов, промежуток считается «нет данных», а не выключением.
 */
function buildDayFromSamples({
  equipmentId,
  date,
  samples = [],
  now = new Date(),
  pollIntervalSec = 30,
  source = 'modbus',
}) {
  const dayStart = moscowDayStart(date);
  const dayEnd = dayStart + 1440 * 60000;
  const today = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const windowEnd = date < today ? dayEnd : date > today ? dayStart : Math.min(dayEnd, now.getTime());
  const elapsedMinutes = Math.max(0, Math.round((Math.min(windowEnd, dayEnd) - dayStart) / 60000));
  const staleMs = Math.max(60, pollIntervalSec * 2) * 1000;
  const intervals = [];
  const minutes = { working: 0, idle: 0, off: 0, fault: 0, unknown: 0 };
  const points = samples
    .map((sample) => ({ at: new Date(sample.observedAt).getTime(), state: sample.state }))
    .filter((sample) => Number.isFinite(sample.at) && MONITORING_STATES.includes(sample.state))
    .sort((a, b) => a.at - b.at);

  if (elapsedMinutes > 0) {
    let cursor = dayStart;
    let state = 'unknown';
    const prior = [...points].reverse().find((sample) => sample.at <= dayStart);
    if (prior && dayStart - prior.at <= staleMs) state = prior.state;

    const inside = points.filter((sample) => sample.at > dayStart && sample.at <= windowEnd);
    inside.forEach((sample) => {
      const gapStartsUnknown = sample.at - cursor > staleMs;
      if (gapStartsUnknown) {
        const holdUntil = Math.min(sample.at, cursor + staleMs);
        pushInterval(intervals, minutes, minuteOfDay(cursor, dayStart), minuteOfDay(holdUntil, dayStart), state);
        pushInterval(intervals, minutes, minuteOfDay(holdUntil, dayStart), minuteOfDay(sample.at, dayStart), 'unknown');
      } else {
        pushInterval(intervals, minutes, minuteOfDay(cursor, dayStart), minuteOfDay(sample.at, dayStart), state);
      }
      cursor = sample.at;
      state = sample.state;
    });

    if (windowEnd - cursor > staleMs) {
      const holdUntil = cursor + staleMs;
      pushInterval(intervals, minutes, minuteOfDay(cursor, dayStart), minuteOfDay(holdUntil, dayStart), state);
      pushInterval(intervals, minutes, minuteOfDay(holdUntil, dayStart), minuteOfDay(windowEnd, dayStart), 'unknown');
    } else {
      pushInterval(intervals, minutes, minuteOfDay(cursor, dayStart), minuteOfDay(windowEnd, dayStart), state);
    }
  }

  const known = elapsedMinutes - minutes.unknown;
  return {
    equipmentId,
    date,
    source,
    timezone: 'Europe/Moscow',
    intervals,
    minutes,
    elapsedMinutes,
    utilization: elapsedMinutes && known > 0 ? Math.round(minutes.working / elapsedMinutes * 1000) / 10 : null,
  };
}

function validateMonitorLink(input = {}) {
  const host = String(input.host || '').trim();
  const port = Number(input.port ?? 502);
  const unitId = Number(input.unitId ?? 1);
  const registerAddress = Number(input.registerAddress ?? 0);
  const pollIntervalSec = Number(input.pollIntervalSec ?? 30);
  if (input.enabled && !host) {
    const error = new Error('Укажите IP-адрес или имя шлюза');
    error.statusCode = 400;
    throw error;
  }
  if (host.length > 255 || /\s/.test(host)) {
    const error = new Error('Некорректный адрес шлюза');
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error('Порт должен быть от 1 до 65535');
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isInteger(unitId) || unitId < 0 || unitId > 255) {
    const error = new Error('Unit ID должен быть от 0 до 255');
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isInteger(registerAddress) || registerAddress < 0 || registerAddress > 65535) {
    const error = new Error('Адрес регистра должен быть от 0 до 65535');
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isInteger(pollIntervalSec) || pollIntervalSec < 5 || pollIntervalSec > 300) {
    const error = new Error('Интервал опроса должен быть от 5 до 300 секунд');
    error.statusCode = 400;
    throw error;
  }
  return {
    enabled: Boolean(input.enabled),
    host,
    port,
    unitId,
    registerAddress,
    pollIntervalSec,
  };
}

module.exports = {
  GATEWAY_VALUE_MAP,
  decodeGatewayValue,
  buildDayFromSamples,
  validateMonitorLink,
};
