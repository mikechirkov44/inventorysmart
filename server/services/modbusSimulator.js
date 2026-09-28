const fs = require('fs');
const ModbusRTU = require('modbus-serial');

let started = false;

function startModbusSimulator({ stdin = false, exitOnError = false } = {}) {
  if (started) return;
  started = true;
  let state = 2;
  const vector = {
    getHoldingRegister(addr) {
      return addr === 0 ? state : 0;
    },
    setRegister(addr, value) {
      if (addr === 0 && [0, 1, 2, 3].includes(Number(value))) state = Number(value);
    },
  };
  const port = Number(process.env.MONITORING_SIMULATOR_PORT || 1502);
  const server = new ModbusRTU.ServerTCP(vector, { host: '127.0.0.1', port, unitID: 1 });
  server.on('serverError', (error) => {
    console.error(`Modbus simulator: ${error.message}`);
    if (exitOnError) process.exit(1);
  });
  server.on('initialized', () => {
    console.log(`Modbus simulator listening on 127.0.0.1:${port}, register 0 = ${state}`);
  });

  const stateFile = process.env.MONITORING_SIMULATOR_FILE || '/tmp/modbus-sim-state';
  const fileTimer = setInterval(() => {
    try {
      const value = Number(fs.readFileSync(stateFile, 'utf8').trim());
      if ([0, 1, 2, 3].includes(value)) state = value;
    } catch { /* файла состояния нет */ }
  }, 1000);
  if (typeof fileTimer.unref === 'function') fileTimer.unref();

  if (stdin) {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      const value = Number(String(chunk).trim());
      if (![0, 1, 2, 3].includes(value)) {
        console.log('Нужно 0, 1, 2 или 3');
        return;
      }
      state = value;
      console.log(`Регистр 0 = ${state}`);
    });
  }
  return server;
}

module.exports = { startModbusSimulator };
