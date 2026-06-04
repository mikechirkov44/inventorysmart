/**
 * @module Маршруты запчастей
 * @description API для CRUD-операций с запасными частями: получение списка с фильтрацией,
 * просмотр по ID, создание, обновление, удаление и пополнение склада.
 */

const express = require('express');
const router = express.Router();
const SparePart = require('../models/sparePart');

/**
 * @route GET /spareParts
 * @description Получение списка запчастей с фильтрацией
 * @param {string} [req.query.search] - Поиск по названию, артикулу, производителю
 * @param {string} [req.query.equipmentId] - Фильтр по ID связанного оборудования
 * @returns {Object[]} Список запчастей
 */
router.get('/', async (req, res) => {
  try {
    let items = await SparePart.findAll();
    const { search, equipmentId } = req.query;
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(s) ||
        (i.article && i.article.toLowerCase().includes(s)) ||
        (i.manufacturer && i.manufacturer.toLowerCase().includes(s))
      );
    }
    if (equipmentId) {
      items = items.filter(i => (i.equipmentIds || []).includes(equipmentId));
    }
    res.json(items);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /spareParts/:id
 * @description Получение запчасти по идентификатору
 * @param {string} req.params.id - Идентификатор запчасти
 * @returns {Object} Данные запчасти
 * @returns {404} Если запчасть не найдена
 */
router.get('/:id', async (req, res) => {
  try {
    const item = await SparePart.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /spareParts
 * @description Создание новой запчасти
 * @param {Object} req.body - Данные запчасти (name, article, manufacturer, quantity, unit, equipmentIds)
 * @returns {Object} Созданная запчасть (201)
 */
router.post('/', async (req, res) => {
  try {
    const item = await SparePart.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /spareParts/:id
 * @description Обновление данных запчасти
 * @param {string} req.params.id - Идентификатор запчасти
 * @param {Object} req.body - Обновлённые данные запчасти
 * @returns {Object} Обновлённая запчасть
 * @returns {404} Если запчасть не найдена
 */
router.put('/:id', async (req, res) => {
  try {
    const item = await SparePart.update(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route DELETE /spareParts/:id
 * @description Удаление запчасти
 * @param {string} req.params.id - Идентификатор запчасти
 * @returns {Object} Результат операции
 * @returns {404} Если запчасть не найдена
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await SparePart.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /spareParts/replenish
 * @description Пополнение склада запчастей (увеличение количества на складе)
 * @param {Object} req.body
 * @param {Array} req.body.items - Массив для пополнения [{sparePartId, quantity}]
 * @returns {Object} Обновлённые запчасти
 */
router.post('/replenish', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const updated = await SparePart.replenishStock(items);
    res.json({ updated });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
