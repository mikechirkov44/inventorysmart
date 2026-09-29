const { startModbusSimulator } = require('../server/services/modbusSimulator');

startModbusSimulator({ stdin: true, exitOnError: true });
console.log('Автоцикл: работа → простой → выключено → авария каждые 30 с. Введите 0–3 для ручного сигнала или auto для возврата.');
