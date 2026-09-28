const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeGatewayValue, buildDayFromSamples, validateMonitorLink } = require('../utils/monitoringTimeline');

test('gateway register maps 0-3 and treats other values as unknown', () => {
  assert.equal(decodeGatewayValue(0), 'off');
  assert.equal(decodeGatewayValue(1), 'idle');
  assert.equal(decodeGatewayValue(2), 'working');
  assert.equal(decodeGatewayValue(3), 'fault');
  assert.equal(decodeGatewayValue(9), 'unknown');
});

test('samples become working intervals and a stale gap becomes unknown', () => {
  const day = buildDayFromSamples({
    equipmentId: 'eq-1',
    date: '2026-09-01',
    now: new Date('2026-09-02T00:00:00+03:00'),
    pollIntervalSec: 180,
    samples: [
      { observedAt: '2026-09-01T08:00:00+03:00', state: 'working' },
      { observedAt: '2026-09-01T08:05:00+03:00', state: 'working' },
      { observedAt: '2026-09-01T08:10:00+03:00', state: 'working' },
      { observedAt: '2026-09-01T10:00:00+03:00', state: 'idle' },
    ],
  });
  assert.equal(day.source, 'modbus');
  assert.ok(day.minutes.working >= 10);
  assert.ok(day.minutes.unknown > 0);
  assert.ok(day.utilization > 0);
});

test('future day has no utilization', () => {
  const day = buildDayFromSamples({
    equipmentId: 'eq-1',
    date: '2026-09-03',
    now: new Date('2026-09-01T12:00:00+03:00'),
    samples: [],
  });
  assert.equal(day.elapsedMinutes, 0);
  assert.equal(day.utilization, null);
});

test('link validation rejects an enabled connection without a host', () => {
  assert.throws(() => validateMonitorLink({ enabled: true, host: '' }), /адрес/i);
  const link = validateMonitorLink({ enabled: false, host: '10.0.0.5', port: 502, unitId: 1, registerAddress: 0, pollIntervalSec: 30 });
  assert.equal(link.host, '10.0.0.5');
});
