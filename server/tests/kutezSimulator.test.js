const test = require('node:test');
const assert = require('node:assert/strict');
const { createKutezSimulator, isKutezDemoLink } = require('../services/kutezSimulator');

test('Kutez simulator powers on, works for chosen duration, then idles', () => {
  let now = 0;
  const simulator = createKutezSimulator(() => now);
  assert.equal(simulator.snapshot().state, 'off');
  simulator.command('power_on');
  assert.equal(simulator.snapshot().state, 'idle');
  simulator.command('start_work', 60);
  assert.equal(simulator.snapshot().state, 'working');
  now = 59999;
  assert.equal(simulator.snapshot().state, 'working');
  now = 60000;
  assert.equal(simulator.snapshot().state, 'idle');
});

test('Kutez simulator fault interrupts work, restore idles, and power off stops it', () => {
  let now = 0;
  const simulator = createKutezSimulator(() => now);
  assert.throws(() => simulator.command('start_work', 60), /включ/);
  simulator.command('power_on');
  simulator.command('start_work', 60);
  simulator.command('fault');
  now = 120000;
  assert.equal(simulator.snapshot().state, 'fault');
  simulator.command('restore');
  assert.equal(simulator.snapshot().state, 'idle');
  simulator.command('power_off');
  assert.equal(simulator.snapshot().state, 'off');
  assert.throws(() => simulator.command('start_work', 0), /включ|длительн/);
});

test('Kutez controls accept only its dedicated local demo register', () => {
  const link = { enabled: true, protocol: 'modbus', host: '127.0.0.1', port: 1502, unitId: 1, registerAddress: 1 };
  assert.equal(isKutezDemoLink(link, true), true);
  assert.equal(isKutezDemoLink({ ...link, registerAddress: 0 }, true), false);
  assert.equal(isKutezDemoLink({ ...link, host: '192.168.1.50' }, true), false);
  assert.equal(isKutezDemoLink(link, false), false);
});
