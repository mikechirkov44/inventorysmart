const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applyShiftView, planAlert, planDowntime, segmentNeedsReason,
  isHourUnit, workingHoursDelta, splitHours, offlineMinutes, validateMonitoringPrefs,
} = require('../utils/monitoringOps');

test('shift utilization counts only the configured window', () => {
  const day = applyShiftView({
    date: '2026-09-01',
    intervals: [
      { startMinute: 0, endMinute: 480, state: 'off' },
      { startMinute: 480, endMinute: 600, state: 'working' },
      { startMinute: 1260, endMinute: 1320, state: 'working' },
    ],
    minutes: {},
    elapsedMinutes: 1440,
  }, { start: '08:00', end: '20:00', now: new Date('2026-09-02T00:00:00+03:00') });
  assert.equal(day.minutes.working, 120);
  assert.equal(day.elapsedMinutes, 720);
  assert.equal(day.utilization, 16.7);
  assert.equal(day.shiftStart, '08:00');
  assert.equal(day.shiftEnd, '20:00');
});

test('shift that has not started has no utilization', () => {
  const day = applyShiftView({
    date: '2026-09-01',
    intervals: [{ startMinute: 0, endMinute: 400, state: 'working' }],
  }, { start: '08:00', end: '20:00', now: new Date('2026-09-01T06:00:00+03:00') });
  assert.equal(day.elapsedMinutes, 0);
  assert.equal(day.utilization, null);
});

test('alert fires once after the threshold and clears when the machine recovers', () => {
  const now = new Date('2026-09-01T12:00:00Z');
  const waiting = planAlert({
    previousState: 'fault',
    state: 'fault',
    alertSince: new Date(now.getTime() - 4 * 60000),
    alertNotified: false,
    now,
    thresholdMinutes: 5,
  });
  assert.equal(waiting.notify, false);
  const due = planAlert({
    previousState: 'fault',
    state: 'fault',
    alertSince: new Date(now.getTime() - 5 * 60000),
    alertNotified: false,
    now,
    thresholdMinutes: 5,
  });
  assert.equal(due.notify, true);
  assert.equal(due.kind, 'fault');
  const again = planAlert({ ...due, previousState: 'fault', state: 'fault', now, thresholdMinutes: 5 });
  assert.equal(again.notify, false);
  const recovered = planAlert({ previousState: 'fault', state: 'working', alertSince: now, alertNotified: true, now, thresholdMinutes: 5 });
  assert.equal(recovered.alertSince, null);
  assert.equal(recovered.notify, false);
});

test('downtime segment opens on idle and closes when the state changes', () => {
  assert.deepEqual(planDowntime({ openState: null, state: 'idle' }), [{ type: 'open', state: 'idle' }]);
  assert.deepEqual(planDowntime({ openState: 'idle', state: 'idle' }), []);
  assert.deepEqual(planDowntime({ openState: 'idle', state: 'working' }), [{ type: 'close' }]);
  assert.deepEqual(planDowntime({ openState: 'idle', state: 'fault' }), [{ type: 'close' }, { type: 'open', state: 'fault' }]);
});

test('a reason is required only after the threshold and until it is set', () => {
  const now = new Date('2026-09-01T12:10:00Z');
  const segment = { startedAt: '2026-09-01T12:00:00Z', endedAt: null, causeId: null };
  assert.equal(segmentNeedsReason(segment, now, 5), true);
  assert.equal(segmentNeedsReason({ ...segment, causeId: 'cause-1' }, now, 5), false);
  assert.equal(segmentNeedsReason(segment, new Date('2026-09-01T12:04:00Z'), 5), false);
});

test('motor hours accumulate only while the machine was working', () => {
  assert.equal(isHourUnit('моточасы'), true);
  assert.equal(isHourUnit('км'), false);
  assert.equal(workingHoursDelta({ previousState: 'idle', gapMs: 60000, staleMs: 60000 }), 0);
  assert.equal(workingHoursDelta({ previousState: 'working', gapMs: 30000, staleMs: 60000 }), 30000 / 3600000);
  assert.equal(workingHoursDelta({ previousState: 'working', gapMs: 10 * 60000, staleMs: 60000 }), 60000 / 3600000);
  const first = splitHours(0, 0.008);
  assert.equal(first.applied, 0);
  const second = splitHours(first.remainder, 0.008);
  assert.equal(second.applied, 0.01);
});

test('offline duration is counted from the last successful poll', () => {
  const now = new Date('2026-09-01T12:12:00Z');
  assert.equal(offlineMinutes({ state: 'unknown', lastSuccessAt: '2026-09-01T12:00:00Z', now }), 12);
  assert.equal(offlineMinutes({ state: 'working', lastSuccessAt: '2026-09-01T12:00:00Z', now }), null);
});

test('monitoring preferences reject an empty shift clock', () => {
  assert.deepEqual(validateMonitoringPrefs({ monitoringAlertMinutes: 5, shiftStart: '08:00', shiftEnd: '20:00' }), {
    monitoringAlertMinutes: 5,
    shiftStart: '08:00',
    shiftEnd: '20:00',
  });
  assert.throws(() => validateMonitoringPrefs({ monitoringAlertMinutes: 0, shiftStart: '08:00', shiftEnd: '20:00' }), /Порог/);
});
