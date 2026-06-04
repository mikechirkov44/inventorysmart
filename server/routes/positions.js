/**
 * @module Маршруты должностей
 * @description API для CRUD-операций с должностями: получение списка, поиск по ID,
 * создание, обновление и удаление. Управление разрешениями по должностям.
 */

const express = require('express');
const router = express.Router();
const Position = require('../models/position');

/**
 * @route GET /positions
 * @description Получение списка всех должностей
 * @returns {Object[]} Список должностей с разрешениями
 */
router.get('/', async (req, res) => {
  try {
    const positions = await Position.findAll();
    res.json(positions);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /positions/:id
 * @description Получение должности по идентификатору
 * @param {string} req.params.id - Идентификатор должности
 * @returns {Object} Данные должности
 * @returns {404} Если должность не найдена
 */
router.get('/:id', async (req, res) => {
  try {
    const position = await Position.findById(req.params.id);
    if (!position) return res.status(404).json({ error: 'Должность не найдена' });
    res.json(position);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /positions
 * @description Создание новой должности
 * @param {Object} req.body
 * @param {string} req.body.name - Название должности (обязательно)
 * @param {Object} [req.body.permissions] - Разрешения для должности
 * @returns {Object} Созданная должность (201)
 * @returns {400} Если название не указано или должность уже существует
 */
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
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /positions/:id
 * @description Обновление данных должности
 * @param {string} req.params.id - Идентификатор должности
 * @param {Object} req.body - Обновлённые данные должности
 * @returns {Object} Обновлённая должность
 * @returns {404} Если должность не найдена
 */
router.put('/:id', async (req, res) => {
  try {
    const position = await Position.update(req.params.id, req.body);
    if (!position) return res.status(404).json({ error: 'Должность не найдена' });
    res.json(position);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route DELETE /positions/:id
 * @description Удаление должности
 * @param {string} req.params.id - Идентификатор должности
 * @returns {Object} Сообщение об успешном удалении
 * @returns {404} Если должность не найдена
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Position.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Должность не найдена' });
    res.json({ message: 'Должность удалена' });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
