/**
 * @module Маршруты инцидентов (поломок)
 * @description API для управления инцидентами: создание поломок, просмотр списка,
 * обновление статуса, удаление. Автоматическая отправка уведомлений администраторам.
 */

const express = require('express');
const router = express.Router();
const Incident = require('../models/incident');
const Notification = require('../models/notification');
const Equipment = require('../models/equipment');
const { authenticate, requirePermission } = require('../middleware/auth');
const { incidentUpload } = require('../utils/upload');

/**
 * @route POST /incidents
 * @description Создание нового инцидента (поломки) с фотографиями
 * @param {Object} req.body - Данные инцидента
 * @param {string} req.body.equipmentId - Идентификатор оборудования
 * @param {string} req.body.description - Описание поломки
 * @param {string} req.body.employeeName - ФИО сотрудника, зафиксировавшего поломку
 * @param {File[]} [req.files] - Фотографии поломки (до 5 файлов)
 * @returns {Object} Созданный инцидент (201)
 */
router.post('/', incidentUpload.array('photos', 5), async (req, res) => {
  try {
    const { equipmentId, description, employeeName, commonFaultId, causeId } = req.body;
    const photos = req.files ? req.files.map(f => f.filename) : [];

    const incident = await Incident.create({
      equipmentId,
      employeeId: req.user.id,
      employeeName,
      description,
      photos,
      commonFaultId: commonFaultId || null,
      causeId: causeId || null
    }, req.user.companyId);

    const equipment = await Equipment.findById(equipmentId, req.user.companyId);
    if (equipment) {
      await Equipment.update(equipmentId, { status: 'needs_repair' }, req.user.companyId);
    }

    const User = require('../models/user');
    const Position = require('../models/position');
    const allUsers = await User.findAllByCompany(req.user.companyId);
    const admins = allUsers.filter(u => {
      if (!u.positionPermissions) return false;
      const perm = u.positionPermissions.incidents;
      return perm === 'full' || perm === true;
    });
    for (const admin of admins) {
      await Notification.create({
        userId: admin.id,
        type: 'incident',
        title: 'Новая поломка',
        message: `${equipment ? equipment.name : 'Оборудование'}: ${description.substring(0, 100)}`,
        equipmentId,
        incidentId: incident.id
      });
    }

    res.status(201).json(incident);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /incidents
 * @description Получение списка инцидентов с фильтрацией
 * @requires permission incidents:view
 * @param {string} [req.query.status] - Фильтр по статусу
 * @param {string} [req.query.equipmentId] - Фильтр по ID оборудования
 * @returns {Object[]} Список инцидентов с данными оборудования
 */
router.get('/', requirePermission('incidents', 'view'), async (req, res) => {
  try {
    let incidents = await Incident.findAll(req.user.companyId);
    const { status, equipmentId } = req.query;

    if (status) incidents = incidents.filter(i => i.status === status);
    if (equipmentId) incidents = incidents.filter(i => i.equipmentId === equipmentId);

    const equipment = await Equipment.findAll(req.user.companyId);
    const eqMap = {};
    equipment.forEach(e => { eqMap[e.id] = e; });

    const enriched = incidents.map(inc => {
      let photos = inc.photos;
      if (typeof photos === 'string') {
        try { photos = JSON.parse(photos); } catch (_) { photos = []; }
      }
      return {
        ...inc,
        photos,
        equipmentName: eqMap[inc.equipmentId] ? eqMap[inc.equipmentId].name : null,
        inventoryNumber: eqMap[inc.equipmentId] ? eqMap[inc.equipmentId].inventoryNumber : null,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /incidents/:id
 * @description Получение инцидента по идентификатору
 * @param {string} req.params.id - Идентификатор инцидента
 * @returns {Object} Данные инцидента с информацией об оборудовании
 * @returns {404} Если инцидент не найден
 */
router.get('/:id', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id, req.user.companyId);
    if (!incident) return res.status(404).json({ error: 'Not found' });

    let photos = incident.photos;
    if (typeof photos === 'string') {
      try { photos = JSON.parse(photos); } catch (_) { photos = []; }
    }

    const equipment = await Equipment.findById(incident.equipmentId, req.user.companyId);
    res.json({
      ...incident,
      photos,
      equipmentName: equipment ? equipment.name : null,
      inventoryNumber: equipment ? equipment.inventoryNumber : null,
    });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /incidents/:id
 * @description Обновление инцидента (статус, заметки администратора)
 * @requires permission incidents:edit
 * @param {string} req.params.id - Идентификатор инцидента
 * @param {Object} req.body
 * @param {string} [req.body.status] - Новый статус (resolved и т.д.)
 * @param {string} [req.body.adminNotes] - Заметки администратора
 * @returns {Object} Обновлённый инцидент
 * @returns {404} Если инцидент не найден
 */
router.put('/:id', requirePermission('incidents', 'edit'), async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const incident = await Incident.update(req.params.id, updateData, req.user.companyId);
    if (!incident) return res.status(404).json({ error: 'Not found' });

    if (status === 'resolved' && incident.employeeId) {
      await Notification.create({
        userId: incident.employeeId,
        type: 'incident_resolved',
        title: 'Инцидент закрыт',
        message: `Инцидент по оборудованию решён`,
        equipmentId: incident.equipmentId,
        incidentId: incident.id
      });
    }

    res.json(incident);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route DELETE /incidents/:id
 * @description Удаление инцидента
 * @requires permission incidents:delete
 * @param {string} req.params.id - Идентификатор инцидента
 * @returns {Object} Результат операции
 * @returns {404} Если инцидент не найден
 */
router.delete('/:id', requirePermission('incidents', 'delete'), async (req, res) => {
  try {
    const deleted = await Incident.remove(req.params.id, req.user.companyId);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
