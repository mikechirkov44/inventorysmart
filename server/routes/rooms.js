/**
 * @module Маршруты помещений
 * @description API для CRUD-операций с помещениями (комнатами): получение списка с фильтрацией,
 * просмотр по ID, создание, обновление и удаление.
 */

const express = require('express');
const router = express.Router();
const Room = require('../models/room');

/**
 * @route GET /rooms
 * @description Получение списка помещений с фильтрацией
 * @param {string} [req.query.name] - Фильтр по названию (частичное совпадение)
 * @param {string} [req.query.building] - Фильтр по зданию
 * @param {string} [req.query.search] - Поиск по названию, описанию, зданию
 * @returns {Object[]} Список помещений
 */
router.get('/', async (req, res) => {
  try {
    let rooms = await Room.findAll(req.user.companyId);
    const { name, building, search } = req.query;

    if (search) {
      const s = search.toLowerCase();
      rooms = rooms.filter(r =>
        r.name.toLowerCase().includes(s) ||
        (r.description && r.description.toLowerCase().includes(s)) ||
        (r.building && r.building.toLowerCase().includes(s))
      );
    }
    if (name) {
      rooms = rooms.filter(r => r.name.toLowerCase().includes(name.toLowerCase()));
    }
    if (building) {
      rooms = rooms.filter(r => r.building === building);
    }

    res.json(rooms);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /rooms/:id
 * @description Получение помещения по идентификатору
 * @param {string} req.params.id - Идентификатор помещения
 * @returns {Object} Данные помещения
 * @returns {404} Если помещение не найдено
 */
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id, req.user.companyId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /rooms
 * @description Создание нового помещения
 * @param {Object} req.body - Данные помещения (name, building, description, responsibleEmployeeId)
 * @returns {Object} Созданное помещение (201)
 */
router.post('/', async (req, res) => {
  try {
    const room = await Room.create(req.body, req.user.companyId);
    res.status(201).json(room);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /rooms/:id
 * @description Обновление данных помещения
 * @param {string} req.params.id - Идентификатор помещения
 * @param {Object} req.body - Обновлённые данные помещения
 * @returns {Object} Обновлённое помещение
 * @returns {404} Если помещение не найдено
 */
router.put('/:id', async (req, res) => {
  try {
    const room = await Room.update(req.params.id, req.body, req.user.companyId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route DELETE /rooms/:id
 * @description Удаление помещения
 * @param {string} req.params.id - Идентификатор помещения
 * @returns {Object} Сообщение об успешном удалении
 * @returns {404} Если помещение не найдено
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Room.remove(req.params.id, req.user.companyId);
    if (!deleted) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
