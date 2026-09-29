const express = require('express');
const rateLimit = require('express-rate-limit');
const EquipmentMonitor = require('../models/equipmentMonitor');
const { KUTEZ_FC7_ID, kutezSimulator, isKutezDemoLink } = require('../services/kutezSimulator');

const router = express.Router();
const writeLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });

function isLocalSimulatorLink(link) {
  return isKutezDemoLink(link) && Number(link.pollIntervalSec) === 15;
}

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (process.env.MONITORING_SIMULATOR !== 'true') return res.status(404).json({ error: 'Тестовый эмулятор выключен' });
  next();
});

router.get('/', (req, res) => res.json(kutezSimulator.snapshot()));

router.post('/connect', writeLimiter, async (req, res) => {
  try {
    const companyId = await EquipmentMonitor.companyIdForEquipment(KUTEZ_FC7_ID);
    if (!companyId) return res.status(404).json({ error: 'Тестовый станок FC7 не найден' });
    const existing = await EquipmentMonitor.find(companyId, KUTEZ_FC7_ID);
    if (existing && !isKutezDemoLink(existing)) {
      return res.status(409).json({ error: 'У FC7 уже настроено другое подключение. Эмулятор не будет его заменять.' });
    }
    if (!isLocalSimulatorLink(existing)) {
      await EquipmentMonitor.save(companyId, KUTEZ_FC7_ID, {
        enabled: true,
        protocol: 'modbus',
        host: '127.0.0.1',
        port: Number(process.env.MONITORING_SIMULATOR_PORT || 1502),
        unitId: 1,
        registerAddress: 0,
        pollIntervalSec: 15,
        signal: '',
      });
    }
    return res.json({ connected: true, equipmentId: KUTEZ_FC7_ID });
  } catch (error) {
    console.error('Public simulator connection failed:', error);
    return res.status(500).json({ error: 'Не удалось подключить тестовый станок к эмулятору' });
  }
});

router.post('/', writeLimiter, (req, res) => {
  try {
    res.json(kutezSimulator.command(req.body?.action, Number(req.body?.durationSec)));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
