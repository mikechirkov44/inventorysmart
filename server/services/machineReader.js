const { readGatewayState } = require('./modbusReader');
const { readMtconnect } = require('./mtconnectReader');
const { readOpcua } = require('./opcuaReader');
const { readFocas } = require('./focasReader');

async function readMachineState(link, reader) {
  if (reader) return reader(link);
  if (link.protocol === 'mtconnect') return readMtconnect(link);
  if (link.protocol === 'opcua') return readOpcua(link);
  if (link.protocol === 'focas') return readFocas(link);
  return readGatewayState(link);
}

module.exports = { readMachineState };
