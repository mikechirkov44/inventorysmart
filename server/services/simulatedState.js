function isSimulatorLink(link, enabled = process.env.MONITORING_SIMULATOR === 'true') {
  return enabled && (link.protocol || 'modbus') === 'modbus'
    && ['127.0.0.1', 'localhost'].includes(link.host)
    && Number(link.port) === Number(process.env.MONITORING_SIMULATOR_PORT || 1502);
}

module.exports = { isSimulatorLink };
