const test = require('node:test');
const assert = require('node:assert/strict');
const { isSimulatorLink } = require('../services/simulatedState');
const { startModbusSimulator } = require('../services/modbusSimulator');
const { readGatewayState } = require('../services/modbusReader');
const { once } = require('node:events');
const { createKutezSimulator } = require('../services/kutezSimulator');

test('demo connection does not trigger real maintenance side effects', () => {
  const simulator = { protocol: 'modbus', host: '127.0.0.1', port: 1502 };
  assert.equal(isSimulatorLink(simulator, true), true);
  assert.equal(isSimulatorLink({ ...simulator, host: '192.168.1.50' }, true), false);
  assert.equal(isSimulatorLink(simulator, false), false);
});

test('shared simulator stays off until Kutez commands change the same register', async () => {
  let now = 0;
  const kutez = createKutezSimulator(() => now);
  process.env.MONITORING_SIMULATOR_PORT = '0';
  const server = startModbusSimulator({ now: () => now, kutez });
  try {
    await once(server, 'initialized');
    const link = { host: '127.0.0.1', port: server._server.address().port, unitId: 1, registerAddress: 0 };
    for (const [elapsed, state] of [[0, 'off'], [30000, 'off'], [60000, 'off'], [90000, 'off'], [120000, 'off']]) {
      now = elapsed;
      const reading = await readGatewayState(link);
      assert.equal(reading.state, state);
    }
    assert.equal((await readGatewayState(link)).state, 'off');
    kutez.command('power_on');
    kutez.command('start_work', 45);
    assert.equal((await readGatewayState(link)).state, 'working');
    now = 165000;
    assert.equal((await readGatewayState(link)).state, 'idle');
  } finally {
    await new Promise(resolve => server.close(resolve));
    delete process.env.MONITORING_SIMULATOR_PORT;
  }
});
