const express = require('express');
const router = express.Router();
const OverdueReason = require('../models/overdueReasons');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const items = await OverdueReason.findAll(req.user.companyId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки справочника' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Название обязательно' });
    }
    const item = await OverdueReason.create({
      companyId: req.user.companyId,
      name
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const item = await OverdueReason.update(req.params.id, req.user.companyId, { name });
    if (!item) return res.status(404).json({ error: 'Не найдено' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await OverdueReason.delete(req.params.id, req.user.companyId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

module.exports = router;
