/**
 * @module Маршруты должностей
 */

const express = require('express');
const router = express.Router();
const Position = require('../models/position');
const { requirePermission } = require('../middleware/auth');

router.get('/', requirePermission('settings', 'view'), async (req, res) => {
  try {
    const positions = await Position.findAll(req.user.companyId);
    res.json(positions);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/:id', requirePermission('settings', 'view'), async (req, res) => {
  try {
    const position = await Position.findById(req.params.id, req.user.companyId);
    if (!position) return res.status(404).json({ error: 'Должность не найдена' });
    res.json(position);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/', requirePermission('settings', 'edit'), async (req, res) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ error: 'Название обязательно' });
    }
    const existing = await Position.findByName(req.body.name.trim(), req.user.companyId);
    if (existing) {
      return res.status(400).json({ error: 'Должность с таким названием уже существует' });
    }
    const position = await Position.create({
      name: req.body.name.trim(),
      permissions: req.body.permissions,
      companyId: req.user.companyId,
    });
    res.status(201).json(position);
  } catch (error) {
    console.error('Route error:', error);
    res.status(error.message?.includes('формул') || error.message?.includes('KPI') ? 400 : 500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
});

router.put('/:id', requirePermission('settings', 'edit'), async (req, res) => {
  try {
    const position = await Position.update(req.params.id, req.body, req.user.companyId);
    if (!position) return res.status(404).json({ error: 'Должность не найдена' });
    res.json(position);
  } catch (error) {
    console.error('Route error:', error);
    res.status(error.message?.includes('формул') || error.message?.includes('KPI') ? 400 : 500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
});

router.delete('/:id', requirePermission('settings', 'edit'), async (req, res) => {
  try {
    const deleted = await Position.remove(req.params.id, req.user.companyId);
    if (!deleted) return res.status(404).json({ error: 'Должность не найдена' });
    res.json({ message: 'Должность удалена' });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
