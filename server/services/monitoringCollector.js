const EquipmentMonitor = require('../models/equipmentMonitor');
const { applyPollEffects } = require('./monitoringEffects');
const { readMachineState } = require('./machineReader');
const { isSimulatorLink } = require('./simulatedState');

const due = new Map();
let timer = null;

async function pollLink(link, reader) {
  let reading;
  try {
    reading = await readMachineState(link, reader);
  } catch (error) {
    reading = { state: 'unknown', value: null, error: error.message || 'Нет ответа от шлюза' };
  }
  const context = await EquipmentMonitor.recordPoll(link, reading);
  if (!isSimulatorLink(link)) {
    try {
      await applyPollEffects(link, reading, context);
    } catch (error) {
      console.error('Monitoring effects error:', error);
    }
  }
  return reading;
}

async function pollDueLinks(reader, now = Date.now()) {
  const links = await EquipmentMonitor.listEnabled();
  const pending = links.filter((link) => {
    const nextAt = due.get(link.equipmentId) || 0;
    return nextAt <= now;
  });
  for (const link of pending) {
    due.set(link.equipmentId, now + link.pollIntervalSec * 1000);
    await pollLink(link, reader);
  }
}

function startMonitoringCollector(reader) {
  if (timer) return;
  timer = setInterval(() => {
    pollDueLinks(reader).catch((error) => console.error('Monitoring poll error:', error));
  }, 5000);
  if (typeof timer.unref === 'function') timer.unref();
}

module.exports = { pollLink, pollDueLinks, startMonitoringCollector };
