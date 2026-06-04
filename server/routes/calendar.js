/**
 * @module Маршруты календаря
 * @description API для получения событий календаря на заданный месяц.
 * Возвращает запланированные работы в формате, пригодном для отображения в календаре.
 */

const express = require('express');
const router = express.Router();
const { getCalendarEvents } = require('../utils/schedule');

/**
 * @route GET /calendar
 * @description Получение событий календаря на указанный месяц
 * @param {number} req.query.month - Месяц (1-12)
 * @param {number} req.query.year - Год (например, 2026)
 * @returns {Object[]} Список событий календаря на заданный период
 */
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    if (isNaN(month) || isNaN(year)) {
      return res.status(400).json({ error: 'month and year required' });
    }

    const events = await getCalendarEvents(year, month, req.user.companyId);
    res.json(events);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
