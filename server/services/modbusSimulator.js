const fs = require('fs');
const ModbusRTU = require('modbus-serial');
const { kutezSimulator } = require('./kutezSimulator');

let started = false;

function startModbusSimulator({ stdin = false, exitOnError = false, kutez = kutezSimulator } = {}) {
  if (started) return;
  started = true;
  let manualState = null;
  const stateFile = process.env.MONITORING_SIMULATOR_FILE;
  const currentState = () => {
    if (stateFile) {
      try {
        const raw = fs.readFileSync(stateFile, 'utf8').trim();
        if (['0', '1', '2', '3'].includes(raw)) return Number(raw);
      } catch { /* Файл не задан: используем ручное или исходное состояние. */ }
    }
    return manualState ?? kutez.snapshot().value;
  };
  const vector = {
    getHoldingRegister(addr) {
      return addr === 0 ? currentState() : 0;
    },
    setRegister(addr, value) {
      if (addr === 0 && [0, 1, 2, 3].includes(Number(value))) manualState = Number(value);
    },
  };
  const port = Number(process.env.MONITORING_SIMULATOR_PORT ?? 1502);
  const server = new ModbusRTU.ServerTCP(vector, { host: '127.0.0.1', port, unitID: 1 });
  server.on('serverError', (error) => {
    console.error(`Modbus simulator: ${error.message}`);
    if (exitOnError) process.exit(1);
  });
  server.on('initialized', () => {
    console.log(`Modbus simulator listening on 127.0.0.1:${port}; register 0 stays off until changed explicitly`);
  });

  if (stdin) {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      const input = String(chunk).trim();
      if (input === 'auto') {
        manualState = null;
        console.log('Регистр 0 снова следует командам страницы эмулятора');
        return;
      }
      if (!['0', '1', '2', '3'].includes(input)) {
        console.log('Нужно 0, 1, 2, 3 или auto');
        return;
      }
      manualState = Number(input);
      console.log(`Регистр 0 = ${manualState}`);
    });
  }
  return server;
}

module.exports = { startModbusSimulator };
