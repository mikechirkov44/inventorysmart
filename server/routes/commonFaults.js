const express = require('express');
const router = express.Router();
const CommonFault = require('../models/commonFaults');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const items = await CommonFault.findAll(req.user.companyId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки справочника' });
  }
});

router.get('/equipment/:equipmentId', authenticate, async (req, res) => {
  try {
    const items = await CommonFault.findByEquipment(req.params.equipmentId, req.user.companyId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки неисправностей' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { equipmentId, name } = req.body;
    if (!equipmentId || !name) {
      return res.status(400).json({ error: 'Оборудование и название обязательны' });
    }
    const item = await CommonFault.create({
      companyId: req.user.companyId,
      equipmentId,
      name
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { equipmentId, name } = req.body;
    const item = await CommonFault.update(req.params.id, req.user.companyId, { equipmentId, name });
    if (!item) return res.status(404).json({ error: 'Не найдено' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await CommonFault.delete(req.params.id, req.user.companyId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

module.exports = router;
