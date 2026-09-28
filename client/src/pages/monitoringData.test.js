import test from 'node:test';
import assert from 'node:assert/strict';

import * as module from '../services/monitoring/demoSource.js';
const now = new Date('2026-09-28T09:15:00Z');

test('demo timelines are stable and partition a whole day without overlaps', async () => {
  assert.ok(module.demoMonitoringSource, 'Demo monitoring source must exist');
  const day = await module.demoMonitoringSource.getDay('machine-a', '2026-09-27', now);
  assert.deepEqual(day, await module.demoMonitoringSource.getDay('machine-a', '2026-09-27', now));
  assert.equal(day.source, 'demo');
  assert.equal(day.elapsedMinutes, 1440);
  let end = 0;
  for (const interval of day.intervals) {
    assert.equal(interval.startMinute, end);
    assert.ok(interval.endMinute > end);
    end = interval.endMinute;
  }
  assert.equal(end, 1440);
  assert.equal(Object.values(day.minutes).reduce((a, b) => a + b, 0), 1440);
  assert.equal(day.utilization, Math.round(day.minutes.working / 1440 * 1000) / 10);
  assert.notDeepEqual(day.intervals, (await module.demoMonitoringSource.getDay('machine-b', '2026-09-27', now)).intervals);
});

test('today contains no future readings and snapshot agrees with timeline', async () => {
  assert.ok(module.demoMonitoringSource);
  const day = await module.demoMonitoringSource.getDay('machine-a', '2026-09-28', now);
  assert.equal(day.elapsedMinutes, 735); // 12:15 Moscow
  assert.equal(day.intervals.at(-1).endMinute, 735);
  const snapshot = await module.demoMonitoringSource.getSnapshot('machine-a', now);
  assert.equal(snapshot.state, day.intervals.at(-1).state);
  assert.equal(snapshot.source, 'demo');
});

test('disabled demo fills elapsed time with unknown and never reports the machine as off', async () => {
  const day = await module.emptyMonitoringSource.getDay('machine-a', '2026-09-27', now);
  assert.equal(day.source, 'none');
  assert.equal(day.utilization, null);
  assert.equal(day.minutes.unknown, 1440);
  assert.equal(day.minutes.off, 0);
  assert.equal(day.minutes.working, 0);
  const snapshot = await module.emptyMonitoringSource.getSnapshot('machine-a', now);
  assert.equal(snapshot.state, 'unknown');
  assert.equal(snapshot.source, 'none');
});

test('future and midnight days do not display fabricated zero utilization', async () => {
  assert.ok(module.demoMonitoringSource);
  const day = await module.demoMonitoringSource.getDay('machine-a', '2026-09-29', now);
  assert.equal(day.utilization, null);
  assert.deepEqual(day.intervals, []);
  const midnight = await module.demoMonitoringSource.getDay('machine-a', '2026-09-29', new Date('2026-09-28T21:00:00Z'));
  assert.equal(midnight.utilization, null);
});

test('range and individual day use exactly the same data and reject invalid dates', async () => {
  assert.ok(module.demoMonitoringSource);
  const range = await module.demoMonitoringSource.getRange(['machine-a'], '2026-09-26', '2026-09-28', now);
  assert.equal(range[0].days.length, 3);
  assert.deepEqual(range[0].days[1], await module.demoMonitoringSource.getDay('machine-a', '2026-09-27', now));
  await assert.rejects(() => module.demoMonitoringSource.getDay('machine-a', '2026-02-30', now));
  await assert.rejects(() => module.demoMonitoringSource.getRange(['machine-a'], '2026-09-28', '2026-09-01', now));
});
