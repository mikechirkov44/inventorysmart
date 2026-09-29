const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
process.env.JWT_SECRET ||= 'public-simulator-test-secret';
const EquipmentMonitor = require('../models/equipmentMonitor');

test('public simulator API controls only the demo signal without a login', async () => {
  const oldEnabled = process.env.MONITORING_SIMULATOR;
  process.env.MONITORING_SIMULATOR = 'true';
  const app = express();
  app.use(express.json());
  app.use('/api/simulator-public', require('../routes/publicSimulator'));
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/simulator-public`;
    const initial = await fetch(base);
    assert.equal(initial.status, 200);
    assert.equal((await initial.json()).state, 'off');
    const powered = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'power_on' }) });
    assert.equal(powered.status, 200);
    assert.equal((await powered.json()).state, 'idle');
    const started = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start_work', durationSec: 60 }) });
    assert.equal(started.status, 200);
    assert.equal((await started.json()).state, 'working');
    const invalid = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start_work', durationSec: -1 }) });
    assert.equal(invalid.status, 400);
    await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'power_off' }) });
    process.env.MONITORING_SIMULATOR = 'false';
    assert.equal((await fetch(base)).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (oldEnabled === undefined) delete process.env.MONITORING_SIMULATOR;
    else process.env.MONITORING_SIMULATOR = oldEnabled;
  }
});

test('public page connects only the fixed FC7 to the local simulator and protects real links', async () => {
  const oldEnabled = process.env.MONITORING_SIMULATOR;
  process.env.MONITORING_SIMULATOR = 'true';
  const originalCompany = EquipmentMonitor.companyIdForEquipment;
  const originalFind = EquipmentMonitor.find;
  const originalSave = EquipmentMonitor.save;
  let existing = null;
  const saved = [];
  EquipmentMonitor.companyIdForEquipment = async () => 'company-1';
  EquipmentMonitor.find = async () => existing;
  EquipmentMonitor.save = async (companyId, equipmentId, link) => {
    saved.push({ companyId, equipmentId, link });
    return { ...link, companyId, equipmentId };
  };
  const app = express();
  app.use(express.json());
  app.use('/api/simulator-public', require('../routes/publicSimulator'));
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/simulator-public/connect`;
    const response = await fetch(base, { method: 'POST' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).connected, true);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].equipmentId, '972a9d41-dcfa-4835-a23f-7c1efaa01e3d');
    assert.equal(saved[0].link.registerAddress, 0);
    assert.equal(saved[0].link.pollIntervalSec, 15);
    existing = { enabled: true, protocol: 'modbus', host: '192.168.1.50', port: 502, registerAddress: 0 };
    assert.equal((await fetch(base, { method: 'POST' })).status, 409);
    assert.equal(saved.length, 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
    EquipmentMonitor.companyIdForEquipment = originalCompany;
    EquipmentMonitor.find = originalFind;
    EquipmentMonitor.save = originalSave;
    if (oldEnabled === undefined) delete process.env.MONITORING_SIMULATOR;
    else process.env.MONITORING_SIMULATOR = oldEnabled;
  }
});
