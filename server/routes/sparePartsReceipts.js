/**
 * @module Маршруты приходных на запчасти
 * @description API для управления приходными документами на запасные части:
 * получение списка, просмотр по ID, создание, удаление и генерация номера документа.
 */

const express = require('express');
const router = express.Router();
const SparePartReceipt = require('../models/sparePartReceipt');

/**
 * @route GET /sparePartsReceipts
 * @description Получение списка всех приходных документов
 * @returns {Object[]} Список приходных
 */
router.get('/', async (req, res) => {
  try {
    const receipts = await SparePartReceipt.findAll();
    res.json(receipts);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /sparePartsReceipts/next-number
 * @description Генерация следующего уникального номера приходного документа
 * @returns {Object} Номер документа
 * @returns {string} return.number
 */
router.get('/next-number', async (req, res) => {
  try {
    const number = await SparePartReceipt.generateDocumentNumber();
    res.json({ number });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /sparePartsReceipts/:id
 * @description Получение приходного документа по идентификатору
 * @param {string} req.params.id - Идентификатор приходного
 * @returns {Object} Данные приходного документа
 * @returns {404} Если документ не найден
 */
router.get('/:id', async (req, res) => {
  try {
    const receipt = await SparePartReceipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ error: 'Not found' });
    res.json(receipt);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /sparePartsReceipts
 * @description Создание нового приходного документа на запчасти
 * @param {Object} req.body - Данные приходного (номер, дата, позиции запчастей)
 * @returns {Object} Созданный приходной документ (201)
 */
router.post('/', async (req, res) => {
  try {
    const receipt = await SparePartReceipt.create(req.body);
    res.status(201).json(receipt);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route DELETE /sparePartsReceipts/:id
 * @description Удаление приходного документа
 * @param {string} req.params.id - Идентификатор приходного
 * @returns {Object} Результат операции
 * @returns {404} Если документ не найден
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await SparePartReceipt.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
