const { startModbusSimulator } = require('../server/services/modbusSimulator');

startModbusSimulator({ stdin: true, exitOnError: true });
console.log('Введите 0 выкл, 1 простой, 2 работа, 3 авария. Ctrl+C — остановить.');
