const test = require('node:test');
const assert = require('node:assert/strict');
const {
  decodeGatewayValue, buildDayFromSamples, validateMonitorLink,
  decodeMtconnectDocument, decodeFocasStatus,
} = require('../utils/monitoringTimeline');

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

test('mtconnect execution and emergency stop map onto machine states', () => {
  const active = decodeMtconnectDocument('<Execution>ACTIVE</Execution><EmergencyStop>ARMED</EmergencyStop>');
  assert.equal(active.state, 'working');
  const fault = decodeMtconnectDocument('<Execution>ACTIVE</Execution><EmergencyStop>TRIGGERED</EmergencyStop>');
  assert.equal(fault.state, 'fault');
  const stopped = decodeMtconnectDocument('<Availability>AVAILABLE</Availability><Execution>STOPPED</Execution>');
  assert.equal(stopped.state, 'off');
  const down = decodeMtconnectDocument('<Availability>UNAVAILABLE</Availability>');
  assert.equal(down.state, 'unknown');
});

test('focas alarm overrides a running program and a stop is idle', () => {
  assert.equal(decodeFocasStatus({ run: 2, alarm: 0, emergency: 0 }), 'working');
  assert.equal(decodeFocasStatus({ run: 2, alarm: 1, emergency: 0 }), 'fault');
  assert.equal(decodeFocasStatus({ run: 0, alarm: 0, emergency: 0 }), 'idle');
  assert.equal(decodeFocasStatus({ run: 1, alarm: 0, emergency: 1 }), 'fault');
});

test('opc ua link requires a node id and unknown protocols are rejected', () => {
  assert.throws(() => validateMonitorLink({ enabled: true, protocol: 'opcua', host: '10.0.0.8', signal: '' }), /NodeId/);
  assert.throws(() => validateMonitorLink({ enabled: true, protocol: 'ethernet', host: '10.0.0.8' }), /протокол/i);
  const link = validateMonitorLink({ enabled: true, protocol: 'mtconnect', host: 'agent.local', port: 5000, signal: 'Mill' });
  assert.equal(link.protocol, 'mtconnect');
  assert.equal(link.signal, 'Mill');
});

test('link validation rejects an enabled connection without a host', () => {
  assert.throws(() => validateMonitorLink({ enabled: true, host: '' }), /адрес/i);
  const link = validateMonitorLink({ enabled: false, host: '10.0.0.5', port: 502, unitId: 1, registerAddress: 0, pollIntervalSec: 30 });
  assert.equal(link.host, '10.0.0.5');
});
