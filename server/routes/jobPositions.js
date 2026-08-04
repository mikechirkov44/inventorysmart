const express = require('express');
const router = express.Router();
const JobPosition = require('../models/jobPosition');
const { requirePermission, requireAdministrator } = require('../middleware/auth');
const { METRICS, validateConfig } = require('../utils/kpiFormula');

router.get('/kpi/metrics', requirePermission('settings', 'view'), (req, res) => res.json(METRICS));

router.get('/catalog', requirePermission('employees', 'view'), async (req, res) => {
  const items = await JobPosition.findAll(req.user.companyId);
  res.json(items.map(({ id, name }) => ({ id, name })));
});

router.get('/', requirePermission('settings', 'view'), async (req, res) => {
  res.json(await JobPosition.findAll(req.user.companyId));
});

router.post('/', requirePermission('settings', 'edit'), requireAdministrator, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Название обязательно' });
    if (await JobPosition.findByName(name, req.user.companyId)) return res.status(400).json({ error: 'Такая должность уже существует' });
    const item = await JobPosition.create({ name, kpiConfig: validateConfig(req.body.kpiConfig), companyId: req.user.companyId });
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Не удалось создать должность' });
  }
});

router.put('/:id', requirePermission('settings', 'edit'), requireAdministrator, async (req, res) => {
  try {
    const data = {};
    if (req.body.name !== undefined) data.name = String(req.body.name).trim();
    if (req.body.kpiConfig !== undefined) data.kpiConfig = validateConfig(req.body.kpiConfig);
    const item = await JobPosition.update(req.params.id, data, req.user.companyId);
    if (!item) return res.status(404).json({ error: 'Должность не найдена' });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Не удалось обновить должность' });
  }
});

router.delete('/:id', requirePermission('settings', 'edit'), requireAdministrator, async (req, res) => {
  const deleted = await JobPosition.remove(req.params.id, req.user.companyId);
  if (!deleted) return res.status(404).json({ error: 'Должность не найдена' });
  res.json({ message: 'Должность удалена' });
});

module.exports = router;
