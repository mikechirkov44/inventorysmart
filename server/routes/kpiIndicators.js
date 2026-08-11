const express = require('express');
const router = express.Router();
const Indicator = require('../models/kpiIndicator');
const { requirePermission, requireAdministrator } = require('../middleware/auth');

function month(value) {
  const raw = /^\d{4}-\d{2}$/.test(value || '') ? value : new Date().toISOString().slice(0, 7);
  return `${raw}-01`;
}

router.get('/', requirePermission('analytics', 'view'), async (req, res) => res.json(await Indicator.findAll(req.user.companyId, month(req.query.month))));
router.post('/', requirePermission('settings', 'edit'), requireAdministrator, async (req, res) => {
  const name = String(req.body.name || '').trim(); const code = String(req.body.code || '').trim().toLowerCase();
  if (!name || !/^[a-z0-9_]+$/.test(code)) return res.status(400).json({ error: 'Укажите название и код латиницей' });
  try { res.status(201).json(await Indicator.create({ ...req.body, name, code }, req.user.companyId)); }
  catch (e) { res.status(400).json({ error: e.code === '23505' ? 'Такой код уже существует' : 'Не удалось создать показатель' }); }
});
router.put('/:id', requirePermission('settings', 'edit'), requireAdministrator, async (req, res) => {
  const item = await Indicator.update(req.params.id, req.body, req.user.companyId);
  if (!item) return res.status(404).json({ error: 'Показатель не найден' }); res.json(item);
});
router.put('/:id/value', requirePermission('settings', 'edit'), requireAdministrator, async (req, res) => {
  const ok = await Indicator.upsertValue(req.params.id, month(req.body.month), Number(req.body.planValue) || 0, Number(req.body.actualValue) || 0, req.user.companyId);
  if (!ok) return res.status(404).json({ error: 'Показатель не найден' }); res.json({ success: true });
});
router.delete('/:id', requirePermission('settings', 'edit'), requireAdministrator, async (req, res) => res.json({ deleted: await Indicator.remove(req.params.id, req.user.companyId) }));
module.exports = router;
