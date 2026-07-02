/**
 * @module Маршруты работ (задач)
 * @description API для CRUD-операций с видами работ/задачами: получение списка с фильтрацией,
 * просмотр по ID, создание, обновление и удаление.
 */

const express = require('express');
const router = express.Router();
const Work = require('../models/work');
const { requirePermission } = require('../middleware/auth');

/**
 * @route GET /works
 * @description Получение списка работ с фильтрацией
 * @param {string} [req.query.name] - Фильтр по названию (частичное совпадение)
 * @param {string} [req.query.category] - Фильтр по категории
 * @param {string} [req.query.search] - Поиск по названию и описанию
 * @returns {Object[]} Список работ
 */
router.get('/', requirePermission('works', 'view'), async (req, res) => {
  try {
    let works = await Work.findAll(req.user.companyId);
    const { name, category, search } = req.query;

    if (search) {
      const s = search.toLowerCase();
      works = works.filter(w =>
        w.name.toLowerCase().includes(s) ||
        (w.description && w.description.toLowerCase().includes(s))
      );
    }
    if (name) {
      works = works.filter(w => w.name.toLowerCase().includes(name.toLowerCase()));
    }
    if (category) {
      works = works.filter(w => w.category === category);
    }

    res.json(works);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /works/:id
 * @description Получение работы по идентификатору
 * @param {string} req.params.id - Идентификатор работы
 * @returns {Object} Данные работы
 * @returns {404} Если работа не найдена
 */
router.get('/:id', requirePermission('works', 'view'), async (req, res) => {
  try {
    const work = await Work.findById(req.params.id, req.user.companyId);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }
    res.json(work);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /works
 * @description Создание новой работы/задачи
 * @param {Object} req.body - Данные работы (name, description, frequencyDays, category)
 * @returns {Object} Созданная работа (201)
 */
router.post('/', requirePermission('works', 'edit'), async (req, res) => {
  try {
    const work = await Work.create(req.body, req.user.companyId);
    res.status(201).json(work);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /works/:id
 * @description Обновление данных работы
 * @param {string} req.params.id - Идентификатор работы
 * @param {Object} req.body - Обновлённые данные работы
 * @returns {Object} Обновлённая работа
 * @returns {404} Если работа не найдена
 */
router.put('/:id', requirePermission('works', 'edit'), async (req, res) => {
  try {
    const work = await Work.update(req.params.id, req.body, req.user.companyId);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }
    res.json(work);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route DELETE /works/:id
 * @description Удаление работы
 * @param {string} req.params.id - Идентификатор работы
 * @returns {Object} Сообщение об успешном удалении
 * @returns {404} Если работа не найдена
 */
router.delete('/:id', requirePermission('works', 'edit'), async (req, res) => {
  try {
    const deleted = await Work.remove(req.params.id, req.user.companyId);
    if (!deleted) {
      return res.status(404).json({ error: 'Work not found' });
    }
    res.json({ message: 'Work deleted successfully' });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
