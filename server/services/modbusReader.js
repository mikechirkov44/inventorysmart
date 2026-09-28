const { decodeGatewayValue } = require('../utils/monitoringTimeline');

/**
 * Читает один holding-регистр Modbus TCP и переводит его в состояние станка.
 * reader можно подменить в проверке связи без реального сокета.
 */
async function readGatewayState(link, reader) {
  const read = reader || readHoldingRegister;
  const value = await read(link);
  return { value: Number(value), state: decodeGatewayValue(value) };
}

async function readHoldingRegister(link) {
  const ModbusRTU = require('modbus-serial');
  const client = new ModbusRTU();
  try {
    await client.connectTCP(link.host, { port: link.port });
    client.setID(link.unitId);
    client.setTimeout(2500);
    const response = await client.readHoldingRegisters(link.registerAddress, 1);
    return response?.data?.[0];
  } finally {
    try { client.close(); } catch { /* сокет уже закрыт */ }
  }
}

module.exports = { readGatewayState, readHoldingRegister };
