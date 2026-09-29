const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET ||= 'monitoring-collector-test-secret';
const EquipmentMonitor = require('../models/equipmentMonitor');
const { pollDueLinks } = require('../services/monitoringCollector');

test('a 15-second monitor link is polled only when its next interval is due', async () => {
  const link = { equipmentId: 'poll-15-second-test', companyId: 'test', enabled: true,
    protocol: 'modbus', host: '127.0.0.1', port: 1502, pollIntervalSec: 15 };
  const originalList = EquipmentMonitor.listEnabled;
  const originalRecord = EquipmentMonitor.recordPoll;
  const originalSimulator = process.env.MONITORING_SIMULATOR;
  const observed = [];
  EquipmentMonitor.listEnabled = async () => [link];
  EquipmentMonitor.recordPoll = async () => ({});
  process.env.MONITORING_SIMULATOR = 'true';
  try {
    for (const now of [0, 5000, 10000, 14999, 15000, 20000, 29999, 30000]) {
      await pollDueLinks(async () => { observed.push(now); return { state: 'off', value: 0 }; }, now);
    }
    assert.deepEqual(observed, [0, 15000, 30000]);
  } finally {
    EquipmentMonitor.listEnabled = originalList;
    EquipmentMonitor.recordPoll = originalRecord;
    if (originalSimulator === undefined) delete process.env.MONITORING_SIMULATOR;
    else process.env.MONITORING_SIMULATOR = originalSimulator;
  }
});
