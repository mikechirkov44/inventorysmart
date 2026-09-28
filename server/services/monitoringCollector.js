const EquipmentMonitor = require('../models/equipmentMonitor');
const { readMachineState } = require('./machineReader');

const due = new Map();
let timer = null;

async function pollLink(link, reader) {
  try {
    const reading = await readMachineState(link, reader);
    await EquipmentMonitor.recordPoll(link, { state: reading.state, value: reading.value, error: null });
    return reading;
  } catch (error) {
    const message = error.message || 'Нет ответа от шлюза';
    await EquipmentMonitor.recordPoll(link, { state: 'unknown', value: null, error: message });
    return { state: 'unknown', error: message };
  }
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
