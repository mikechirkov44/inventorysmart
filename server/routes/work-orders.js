/**
 * @module Маршруты наряд-заказов
 * @description API для управления наряд-заказами (Work Orders): получение списка,
 * просмотр по ID, фильтрация по оборудованию, создание, обновление и удаление.
 * Поддержка загрузки фотографий и автоматического списания запчастей при завершении.
 */

const express = require('express');
const router = express.Router();
const WorkOrder = require('../models/workOrder');
const SparePart = require('../models/sparePart');
const { imageUpload } = require('../utils/upload');

/**
 * @route GET /work-orders
 * @description Получение списка всех наряд-заказов
 * @returns {Object[]} Список наряд-заказов
 */
router.get('/', async (req, res) => {
  try {
    const workOrders = await WorkOrder.findAll();
    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /work-orders/:id
 * @description Получение наряд-заказа по идентификатору
 * @param {string} req.params.id - Идентификатор наряд-заказа
 * @returns {Object} Данные наряд-заказа
 * @returns {404} Если наряд-заказ не найден
 */
router.get('/:id', async (req, res) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    res.json(workOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /work-orders/equipment/:equipmentId
 * @description Получение всех наряд-заказов для конкретного оборудования
 * @param {string} req.params.equipmentId - Идентификатор оборудования
 * @returns {Object[]} Список наряд-заказов для указанного оборудования
 */
router.get('/equipment/:equipmentId', async (req, res) => {
  try {
    const workOrders = await WorkOrder.findByEquipmentId(req.params.equipmentId);
    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /work-orders
 * @description Создание нового наряд-заказа с возможностью загрузки фотографий
 * @param {Object} req.body - Данные наряд-заказа (equipmentId, taskId, taskName, masterName, status, notes)
 * @param {File[]} [req.files] - Фотографии (до 10 файлов, multipart/form-data)
 * @returns {Object} Созданный наряд-заказ (201)
 */
router.post('/', imageUpload.array('photos', 10), async (req, res) => {
  try {
    const workOrderData = req.body;
    if (req.files && req.files.length > 0) {
      workOrderData.photos = req.files.map(file => file.filename);
    }
    const workOrder = await WorkOrder.create(workOrderData);
    res.status(201).json(workOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /work-orders/:id
 * @description Обновление наряд-заказа. При переводе из pending в completed — автоматическое списание запчастей.
 * @param {string} req.params.id - Идентификатор наряд-заказа
 * @param {Object} req.body - Обновлённые данные (status, notes, sparePartsUsed и т.д.)
 * @param {File[]} [req.files] - Дополнительные фотографии (до 10 файлов)
 * @returns {Object} Обновлённый наряд-заказ
 * @returns {Object} return.workOrder - Обновлённый наряд-заказ
 * @returns {Object[]} [return.sparePartsDeducted] - Списанные запчасти (при завершении)
 * @returns {404} Если наряд-заказ не найден
 */
router.put('/:id', imageUpload.array('photos', 10), async (req, res) => {
  try {
    const workOrderData = req.body;
    if (req.files && req.files.length > 0) {
      const existingWorkOrder = await WorkOrder.findById(req.params.id);
      let existingPhotos = [];
      if (existingWorkOrder && existingWorkOrder.photos) {
        existingPhotos = typeof existingWorkOrder.photos === 'string'
          ? JSON.parse(existingWorkOrder.photos)
          : existingWorkOrder.photos;
      }
      workOrderData.photos = [...existingPhotos, ...req.files.map(file => file.filename)];
    }

    const existingOrder = await WorkOrder.findById(req.params.id);
    const wasPending = existingOrder && existingOrder.status === 'pending';
    const isNowCompleted = workOrderData.status === 'completed';

    if (workOrderData.sparePartsUsed && typeof workOrderData.sparePartsUsed === 'string') {
      try { workOrderData.sparePartsUsed = JSON.parse(workOrderData.sparePartsUsed); } catch (_) { workOrderData.sparePartsUsed = []; }
    }

    const workOrder = await WorkOrder.update(req.params.id, workOrderData);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    let sparePartsUsed = workOrder.sparePartsUsed;
    if (typeof sparePartsUsed === 'string') {
      try { sparePartsUsed = JSON.parse(sparePartsUsed); } catch (_) { sparePartsUsed = []; }
    }

    if (wasPending && isNowCompleted && sparePartsUsed && sparePartsUsed.length > 0) {
      const deducted = await SparePart.deductStock(sparePartsUsed);
      return res.json({ workOrder, sparePartsDeducted: deducted });
    }

    res.json(workOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route DELETE /work-orders/:id
 * @description Удаление наряд-заказа
 * @param {string} req.params.id - Идентификатор наряд-заказа
 * @returns {Object} Сообщение об успешном удалении
 * @returns {404} Если наряд-заказ не найден
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await WorkOrder.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    res.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
