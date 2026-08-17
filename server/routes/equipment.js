/**
 * @module Маршруты оборудования
 * @description API для CRUD-операций с оборудованием: получение списка с фильтрацией,
 * просмотр по ID, генерация QR-кода, создание, обновление и удаление.
 */

const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Equipment = require('../models/equipment');
const OperatingHours = require('../models/operatingHours');
const { authenticate, requirePermission } = require('../middleware/auth');
const { imageUpload, pdfUpload } = require('../utils/upload');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /equipment
 * @description Получение списка оборудования с фильтрацией
 */
router.get('/', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    let equipment = await Equipment.findAll(req.user.companyId);
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
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /equipment
 * @description Создание нового оборудования
 */
router.post('/', requirePermission('equipment', 'edit'), imageUpload.single('photo'), async (req, res) => {
  try {
    const equipmentData = req.body;
    if (req.file) {
      equipmentData.photo = req.file.filename;
    }
    
    if (typeof equipmentData.workIds === 'string') {
      equipmentData.workIds = JSON.parse(equipmentData.workIds);
    }
    if (typeof equipmentData.workLinks === 'string') {
      equipmentData.workLinks = JSON.parse(equipmentData.workLinks);
    }
    
    const equipment = await Equipment.create(equipmentData, req.user.companyId);
    res.status(201).json(equipment);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ===== SPECIFIC ROUTES (must be BEFORE /:id) =====

/**
 * @route GET /equipment/:id/qr
 * @description Генерация QR-кода для оборудования
 */
router.get('/:id/qr', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id, req.user.companyId);
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
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /equipment/:id/operating-hours
 * @description Получить наработку оборудования с интервалами ТО
 */
router.get('/:id/operating-hours', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await OperatingHours.getWithIntervals(id);
    if (!data) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching operating hours:', err);
    res.status(500).json({ error: 'Failed to fetch operating hours' });
  }
});

/**
 * @route PUT /equipment/:id/operating-hours
 * @description Создать или обновить наработку оборудования
 */
router.put('/:id/operating-hours', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      unit,
      currentValue,
      inputDate,
      assignedTo,
      workIds,
      autoCreateTasks,
      preventDecrease
    } = req.body;

    const data = await OperatingHours.upsert({
      equipmentId: id,
      companyId: req.user.companyId,
      unit,
      currentValue,
      inputDate,
      assignedTo,
      workIds,
      autoCreateTasks,
      preventDecrease
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error saving operating hours:', err);
    if (err.message === 'Уменьшение наработки запрещено') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to save operating hours' });
  }
});

/**
 * @route DELETE /equipment/:id/operating-hours
 * @description Удалить наработку оборудования
 */
router.delete('/:id/operating-hours', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    await OperatingHours.delete(id);
    res.json({ success: true, message: 'Operating hours deleted' });
  } catch (err) {
    console.error('Error deleting operating hours:', err);
    res.status(500).json({ error: 'Failed to delete operating hours' });
  }
});

/**
 * @route POST /equipment/:id/operating-hours/intervals
 * @description Добавить интервал ТО
 */
router.post('/:id/operating-hours/intervals', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { intervalValue, lastMaintenanceValue, description } = req.body;

    // Get operating hours ID for this equipment
    const oh = await OperatingHours.getByEquipmentId(id);
    if (!oh) {
      return res.status(404).json({ error: 'Operating hours not found' });
    }

    const data = await OperatingHours.addInterval({
      operatingHoursId: oh.id,
      intervalValue,
      lastMaintenanceValue,
      description
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error adding interval:', err);
    res.status(500).json({ error: 'Failed to add interval' });
  }
});

// ===== GENERIC ROUTES (must be AFTER specific routes) =====

/**
 * @route GET /equipment/:id
 * @description Получение оборудования по идентификатору
 */
router.get('/:id', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id, req.user.companyId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(equipment);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /equipment/:id
 * @description Обновление данных оборудования
 */
router.put('/:id', requirePermission('equipment', 'edit'), imageUpload.single('photo'), async (req, res) => {
  try {
    const equipmentData = req.body;
    if (req.file) {
      equipmentData.photo = req.file.filename;
    }
    
    if (typeof equipmentData.workIds === 'string') {
      equipmentData.workIds = JSON.parse(equipmentData.workIds);
    }
    if (typeof equipmentData.workLinks === 'string') {
      equipmentData.workLinks = JSON.parse(equipmentData.workLinks);
    }
    
    const equipment = await Equipment.update(req.params.id, equipmentData, req.user.companyId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(equipment);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route DELETE /equipment/:id
 * @description Удаление оборудования
 */
router.delete('/:id', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const deleted = await Equipment.remove(req.params.id, req.user.companyId);
    if (!deleted) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /equipment/:id/instruction-pdf
 * @description Загрузка инструкции в формате PDF, DOC или DOCX
 * @requires permission instructions:full
 */
router.post('/:id/instruction-pdf', requirePermission('instructions', 'full'), pdfUpload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    const equipment = await Equipment.update(req.params.id, {
      instructionPdf: req.file.filename
    }, req.user.companyId);
    
    if (!equipment) {
      return res.status(404).json({ error: 'Оборудование не найдено' });
    }
    
    const { buildSignedUploadUrl } = require('../utils/uploadAccess');

    res.json({
      success: true,
      filename: req.file.filename,
      url: buildSignedUploadUrl(req.file.filename, req.user.companyId),
    });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route DELETE /equipment/:id/instruction-pdf
 * @description Удаление файла инструкции
 * @requires permission instructions:full
 */
router.delete('/:id/instruction-pdf', requirePermission('instructions', 'full'), async (req, res) => {
  try {
    const equipment = await Equipment.update(req.params.id, {
      instructionPdf: null
    }, req.user.companyId);
    
    if (!equipment) {
      return res.status(404).json({ error: 'Оборудование не найдено' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /equipment/:id/instruction-md
 * @description Обновление Markdown инструкции
 * @requires permission instructions:full
 */
router.put('/:id/instruction-md', requirePermission('instructions', 'full'), async (req, res) => {
  try {
    const { content } = req.body;
    
    const equipment = await Equipment.update(req.params.id, {
      instructionMd: content || null
    }, req.user.companyId);
    
    if (!equipment) {
      return res.status(404).json({ error: 'Оборудование не найдено' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
