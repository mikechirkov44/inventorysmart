const express = require('express');
const router = express.Router();
const Position = require('../models/position');

router.get('/', async (req, res) => {
  try {
    const positions = await Position.findAll();
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const position = await Position.findById(req.params.id);
    if (!position) return res.status(404).json({ error: 'Должность не найдена' });
    res.json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ error: 'Название обязательно' });
    }
    const existing = await Position.findByName(req.body.name.trim());
    if (existing) {
      return res.status(400).json({ error: 'Должность с таким названием уже существует' });
    }
    const position = await Position.create({ name: req.body.name.trim(), permissions: req.body.permissions });
    res.status(201).json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const position = await Position.update(req.params.id, req.body);
    if (!position) return res.status(404).json({ error: 'Должность не найдена' });
    res.json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Position.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Должность не найдена' });
    res.json({ message: 'Должность удалена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
