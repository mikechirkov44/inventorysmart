/**
 * @module Маршруты оборудования
 * @description API для CRUD-операций с оборудованием: получение списка с фильтрацией,
 * просмотр по ID, генерация QR-кода, создание, обновление и удаление.
 */

const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Equipment = require('../models/equipment');
const { imageUpload } = require('../utils/upload');

/**
 * @route GET /equipment
 * @description Получение списка оборудования с фильтрацией
 * @param {string} [req.query.name] - Фильтр по названию (частичное совпадение)
 * @param {string} [req.query.category] - Фильтр по категории
 * @param {string} [req.query.location] - Фильтр по местоположению
 * @param {string} [req.query.search] - Поиск по названию, инвентарному номеру, описанию
 * @returns {Object[]} Список оборудования
 */
router.get('/', async (req, res) => {
  try {
    let equipment = await Equipment.findAll();
    const { name, category, location, search } = req.query;

    if (search) {
      const s = search.toLowerCase();
      equipment = equipment.filter(e =>
        e.name.toLowerCase().includes(s) ||
        e.inventoryNumber.toLowerCase().includes(s) ||
        (e.description && e.description.toLowerCase().includes(s))
      );
    }
    if (name) {
      equipment = equipment.filter(e => e.name.toLowerCase().includes(name.toLowerCase()));
    }
    if (category) {
      equipment = equipment.filter(e => e.category === category);
    }
    if (location) {
      equipment = equipment.filter(e => e.location === location);
    }

    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /equipment/:id
 * @description Получение оборудования по идентификатору
 * @param {string} req.params.id - Идентификатор оборудования
 * @returns {Object} Данные оборудования
 * @returns {404} Если оборудование не найдено
 */
router.get('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /equipment/:id/qr
 * @description Генерация QR-кода для оборудования
 * @param {string} req.params.id - Идентификатор оборудования
 * @returns {Object} Данные QR-кода
 * @returns {string} return.equipmentId - Идентификатор оборудования
 * @returns {string} return.qrCode - UUID QR-кода
 * @returns {string} return.qrImage - Base64 Data URL изображения QR-кода
 * @returns {string} return.scanUrl - URL для сканирования
 * @returns {404} Если оборудование не найдено
 */
router.get('/:id/qr', async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    const frontendBase = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const qrUrl = `${frontendBase}/scan/${equipment.qrCode}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({ 
      equipmentId: equipment.id,
      qrCode: equipment.qrCode,
      qrImage: qrCodeDataUrl,
      scanUrl: qrUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /equipment
 * @description Создание нового оборудования
 * @param {Object} req.body - Данные оборудования (name, inventoryNumber, description, location, category, workIds)
 * @param {File} [req.file] - Фотография оборудования (multipart/form-data)
 * @returns {Object} Созданное оборудование (201)
 */
router.post('/', imageUpload.single('photo'), async (req, res) => {
  try {
    const equipmentData = req.body;
    if (req.file) {
      equipmentData.photo = req.file.filename;
    }
    
    if (typeof equipmentData.workIds === 'string') {
      equipmentData.workIds = JSON.parse(equipmentData.workIds);
    }
    
    const equipment = await Equipment.create(equipmentData);
    res.status(201).json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /equipment/:id
 * @description Обновление данных оборудования
 * @param {string} req.params.id - Идентификатор оборудования
 * @param {Object} req.body - Обновлённые данные оборудования
 * @param {File} [req.file] - Новая фотография оборудования (multipart/form-data)
 * @returns {Object} Обновлённое оборудование
 * @returns {404} Если оборудование не найдено
 */
router.put('/:id', imageUpload.single('photo'), async (req, res) => {
  try {
    const equipmentData = req.body;
    if (req.file) {
      equipmentData.photo = req.file.filename;
    }
    
    if (typeof equipmentData.workIds === 'string') {
      equipmentData.workIds = JSON.parse(equipmentData.workIds);
    }
    
    const equipment = await Equipment.update(req.params.id, equipmentData);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route DELETE /equipment/:id
 * @description Удаление оборудования
 * @param {string} req.params.id - Идентификатор оборудования
 * @returns {Object} Сообщение об успешном удалении
 * @returns {404} Если оборудование не найдено
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Equipment.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
