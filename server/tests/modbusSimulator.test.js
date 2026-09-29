const test = require('node:test');
const assert = require('node:assert/strict');
const { simulatedStateAt, isSimulatorLink } = require('../services/simulatedState');
const { startModbusSimulator } = require('../services/modbusSimulator');
const { readGatewayState } = require('../services/modbusReader');
const { once } = require('node:events');
const { createKutezSimulator } = require('../services/kutezSimulator');

test('simulator cycles through work, idle, off and fault without manual input', () => {
  assert.equal(simulatedStateAt(0), 2);
  assert.equal(simulatedStateAt(29999), 2);
  assert.equal(simulatedStateAt(30000), 1);
  assert.equal(simulatedStateAt(60000), 0);
  assert.equal(simulatedStateAt(90000), 3);
  assert.equal(simulatedStateAt(120000), 2);
});

test('demo connection does not trigger real maintenance side effects', () => {
  const simulator = { protocol: 'modbus', host: '127.0.0.1', port: 1502 };
  assert.equal(isSimulatorLink(simulator, true), true);
  assert.equal(isSimulatorLink({ ...simulator, host: '192.168.1.50' }, true), false);
  assert.equal(isSimulatorLink(simulator, false), false);
});

test('Modbus reader receives automatic state changes from the emulator register', async () => {
  let now = 0;
  const kutez = createKutezSimulator(() => now);
  process.env.MONITORING_SIMULATOR_PORT = '0';
  const server = startModbusSimulator({ now: () => now, kutez });
  try {
    await once(server, 'initialized');
    const link = { host: '127.0.0.1', port: server._server.address().port, unitId: 1, registerAddress: 0 };
    for (const [elapsed, state] of [[0, 'working'], [30000, 'idle'], [60000, 'off'], [90000, 'fault'], [120000, 'working']]) {
      now = elapsed;
      const reading = await readGatewayState(link);
      assert.equal(reading.state, state);
    }
    const kutezLink = { ...link, registerAddress: 1 };
    assert.equal((await readGatewayState(kutezLink)).state, 'off');
    kutez.command('power_on');
    kutez.command('start_work', 45);
    assert.equal((await readGatewayState(kutezLink)).state, 'working');
    now = 165000;
    assert.equal((await readGatewayState(kutezLink)).state, 'idle');
  } finally {
    await new Promise(resolve => server.close(resolve));
    delete process.env.MONITORING_SIMULATOR_PORT;
  }
});
