const express = require('express');
const router = express.Router();
const EquipmentMonitor = require('../models/equipmentMonitor');
const Equipment = require('../models/equipment');
const Company = require('../models/company');
const { requirePermission, requireAdministrator } = require('../middleware/auth');
const { operatorWindowStart } = require('../utils/monitoringOps');
const { validateMonitorLink } = require('../utils/monitoringTimeline');
const { readMachineState } = require('../services/machineReader');
const { pollLink } = require('../services/monitoringCollector');
const { KUTEZ_FC7_ID, kutezSimulator, isKutezDemoLink } = require('../services/kutezSimulator');
const { isSimulatorLink } = require('../services/simulatedState');

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

async function kutezContext(req, res, next) {
  if (process.env.MONITORING_SIMULATOR !== 'true') return res.status(404).json({ error: 'Эмулятор на сервере не включён' });
  try {
    const equipment = await Equipment.findById(KUTEZ_FC7_ID, req.user.companyId);
    if (!equipment) return res.status(404).json({ error: 'Станок Kutez FC7 не найден в вашей компании' });
    req.kutezLink = await EquipmentMonitor.find(req.user.companyId, KUTEZ_FC7_ID);
    next();
  } catch (error) {
    console.error('Kutez simulator access error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

router.get('/simulator/kutez-fc7', requirePermission('equipment', 'edit'), requireAdministrator, kutezContext, (req, res) => {
  res.json({ equipmentId: KUTEZ_FC7_ID, connected: isKutezDemoLink(req.kutezLink), ...kutezSimulator.snapshot() });
});

router.post('/simulator/kutez-fc7/connect', requirePermission('equipment', 'edit'), requireAdministrator, kutezContext, async (req, res) => {
  try {
    if (req.kutezLink?.enabled && !isSimulatorLink(req.kutezLink)) return res.status(409).json({ error: 'У станка уже есть подключение к реальному оборудованию. Отключите его перед тестом.' });
    const link = await EquipmentMonitor.save(req.user.companyId, KUTEZ_FC7_ID, {
      enabled: true, protocol: 'modbus', host: '127.0.0.1', port: Number(process.env.MONITORING_SIMULATOR_PORT || 1502),
      unitId: 1, registerAddress: 0, signal: '', pollIntervalSec: 5,
    });
    await pollLink(link);
    res.json({ equipmentId: KUTEZ_FC7_ID, connected: true, ...kutezSimulator.snapshot() });
  } catch (error) {
    console.error('Kutez simulator connect error:', error);
    res.status(500).json({ error: 'Не удалось подключить эмулятор' });
  }
});

router.post('/simulator/kutez-fc7/command', requirePermission('equipment', 'edit'), requireAdministrator, kutezContext, async (req, res) => {
  if (!isKutezDemoLink(req.kutezLink)) return res.status(409).json({ error: 'Сначала подключите тестовый сигнал Kutez FC7' });
  try {
    const state = kutezSimulator.command(req.body?.action, Number(req.body?.durationSec));
    await pollLink(req.kutezLink);
    res.json(state);
  } catch (error) {
    if (error.message?.includes('Не удалось')) return res.status(502).json({ error: 'Не удалось считать сигнал эмулятора' });
    res.status(400).json({ error: error.message });
  }
});

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

router.get('/statuses', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    res.json(await EquipmentMonitor.listStatuses(req.user.companyId));
  } catch (error) {
    console.error('Monitoring statuses error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/downtime/:equipmentId', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    res.json(await EquipmentMonitor.downtimeFor(req.user.companyId, req.params.equipmentId));
  } catch (error) {
    console.error('Monitoring downtime error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/downtime/:id', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const saved = await EquipmentMonitor.assignCause(req.user.companyId, req.params.id, req.body.causeId);
    if (!saved) return res.status(404).json({ error: 'Простой или причина не найдены' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Monitoring cause error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/operator/:equipmentId', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    const company = await Company.get(req.user.companyId);
    const since = operatorWindowStart(new Date(), company.shiftStart, company.shiftEnd);
    const operator = await EquipmentMonitor.currentOperator(req.user.companyId, req.params.equipmentId, since);
    res.json({ operator, shiftStart: company.shiftStart, shiftEnd: company.shiftEnd });
  } catch (error) {
    console.error('Monitoring operator error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/operator/:equipmentId', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const operator = await EquipmentMonitor.assignOperator(req.user.companyId, req.params.equipmentId, req.body.employeeId);
    res.json({ operator });
  } catch (error) {
    console.error('Monitoring operator assign error:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Внутренняя ошибка сервера' });
  }
});

router.delete('/operator/:equipmentId', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    await EquipmentMonitor.releaseOperator(req.user.companyId, req.params.equipmentId);
    res.json({ operator: null });
  } catch (error) {
    console.error('Monitoring operator release error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/day', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    if (!datePattern.test(req.query.date || '')) return res.status(400).json({ error: 'Некорректная дата' });
    const mode = req.query.mode === 'shift' ? 'shift' : 'day';
    const day = await EquipmentMonitor.day(req.user.companyId, req.query.equipmentId, req.query.date, new Date(), mode);
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
    const mode = req.query.mode === 'shift' ? 'shift' : 'day';
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
      for (const date of dates) days.push(await EquipmentMonitor.day(req.user.companyId, equipmentId, date, new Date(), mode));
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
