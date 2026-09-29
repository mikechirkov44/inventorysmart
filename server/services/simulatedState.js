const STATES = [2, 1, 0, 3]; // Работа, простой, выключено, авария.
const PHASE_MS = 30_000;

function simulatedStateAt(elapsedMs) {
  return STATES[Math.floor(Math.max(0, elapsedMs) / PHASE_MS) % STATES.length];
}

function isSimulatorLink(link, enabled = process.env.MONITORING_SIMULATOR === 'true') {
  return enabled && (link.protocol || 'modbus') === 'modbus'
    && ['127.0.0.1', 'localhost'].includes(link.host)
    && Number(link.port) === Number(process.env.MONITORING_SIMULATOR_PORT || 1502);
}

module.exports = { simulatedStateAt, isSimulatorLink };
