const { decodeGatewayValue, decodeNamedState } = require('../utils/monitoringTimeline');

function decodeOpcValue(value) {
  if (typeof value === 'number' || (typeof value === 'string' && /^-?\d+$/.test(value.trim()))) {
    const numeric = Number(value);
    return { value: numeric, state: decodeGatewayValue(numeric) };
  }
  if (typeof value === 'boolean') return { value: value ? 2 : 1, state: value ? 'working' : 'idle' };
  return { value: null, state: decodeNamedState(value) };
}

async function readOpcua(link) {
  let opcua;
  try {
    opcua = require('node-opcua');
  } catch {
    throw new Error('Клиент OPC UA не установлен на сервере');
  }
  const { OPCUAClient, MessageSecurityMode, SecurityPolicy, AttributeIds } = opcua;
  const client = OPCUAClient.create({
    applicationName: 'InventorySmart',
    endpointMustExist: false,
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
    connectionStrategy: { initialDelay: 200, maxRetry: 0, maxDelay: 200 },
    requestedSessionTimeout: 8000,
  });
  let session = null;
  try {
    await client.connect(`opc.tcp://${link.host}:${link.port}`);
    session = await client.createSession();
    const dataValue = await session.read({ nodeId: link.signal, attributeId: AttributeIds.Value });
    const statusCode = dataValue?.statusCode;
    if (statusCode && typeof statusCode.isGood === 'function' && !statusCode.isGood()) {
      throw new Error(String(statusCode));
    }
    return decodeOpcValue(dataValue.value?.value);
  } finally {
    try { if (session) await session.close(); } catch { /* сессия уже закрыта */ }
    try { await client.disconnect(); } catch { /* сокет уже закрыт */ }
  }
}

module.exports = { readOpcua, decodeOpcValue };
