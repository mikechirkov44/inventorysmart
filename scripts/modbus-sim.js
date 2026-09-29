const { startModbusSimulator } = require('../server/services/modbusSimulator');

startModbusSimulator({ stdin: true, exitOnError: true });
console.log('Регистр 0 по умолчанию: выключено. Им управляет страница Kutez FC7; в консоли можно ввести 0–3 или auto для возврата к управлению страницей.');
