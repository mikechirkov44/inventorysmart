const express = require('express');
const router = express.Router();
const EquipmentMonitor = require('../models/equipmentMonitor');
const { requirePermission } = require('../middleware/auth');
const { validateMonitorLink } = require('../utils/monitoringTimeline');
const { readMachineState } = require('../services/machineReader');
const { pollLink } = require('../services/monitoringCollector');

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

router.get('/live', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    res.json({ equipmentIds: await EquipmentMonitor.listLiveIds(req.user.companyId) });
  } catch (error) {
    console.error('Monitoring live error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/links/:equipmentId', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    const link = await EquipmentMonitor.find(req.user.companyId, req.params.equipmentId);
    res.json(link || {
      equipmentId: req.params.equipmentId,
      enabled: false,
      host: '',
      protocol: 'modbus',
      port: 502,
      unitId: 1,
      registerAddress: 0,
      signal: '',
      pollIntervalSec: 30,
      template: 'modbus',
      lastState: null,
      lastError: null,
    });
  } catch (error) {
    console.error('Monitoring link error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/links/:equipmentId', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const link = validateMonitorLink(req.body);
    const saved = await EquipmentMonitor.save(req.user.companyId, req.params.equipmentId, link);
    if (!saved) return res.status(404).json({ error: 'Оборудование не найдено' });
    if (saved.enabled) await pollLink(saved);
    res.json(await EquipmentMonitor.find(req.user.companyId, req.params.equipmentId));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('Monitoring save error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/links/:equipmentId/test', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const link = validateMonitorLink({ ...req.body, enabled: true });
    const reading = await readMachineState(link);
    res.json({ ok: true, ...reading });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    res.status(502).json({ ok: false, error: error.message || 'Шлюз не ответил' });
  }
});

router.get('/day', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    if (!datePattern.test(req.query.date || '')) return res.status(400).json({ error: 'Некорректная дата' });
    const day = await EquipmentMonitor.day(req.user.companyId, req.query.equipmentId, req.query.date);
    if (!day) return res.status(404).json({ error: 'Подключение не настроено' });
    res.json(day);
  } catch (error) {
    console.error('Monitoring day error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/range', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!datePattern.test(from || '') || !datePattern.test(to || '') || from > to) {
      return res.status(400).json({ error: 'Укажите корректный период' });
    }
    const ids = String(req.query.equipmentIds || '').split(',').filter(Boolean);
    const live = new Set(await EquipmentMonitor.listLiveIds(req.user.companyId));
    const rows = [];
    for (const equipmentId of ids.filter((id) => live.has(id))) {
      const dates = [];
      const cursor = new Date(`${from}T00:00:00Z`);
      const end = new Date(`${to}T00:00:00Z`);
      while (cursor <= end) {
        dates.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      const days = [];
      for (const date of dates) days.push(await EquipmentMonitor.day(req.user.companyId, equipmentId, date));
      rows.push({ equipmentId, days });
    }
    res.json(rows);
  } catch (error) {
    console.error('Monitoring range error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/snapshot', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    const snapshot = await EquipmentMonitor.snapshot(req.user.companyId, req.query.equipmentId);
    if (!snapshot) return res.status(404).json({ error: 'Подключение не настроено' });
    res.json(snapshot);
  } catch (error) {
    console.error('Monitoring snapshot error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
