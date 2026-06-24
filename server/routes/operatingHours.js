/**
 * @module operatingHours
 * @description API для управления наработкой оборудования и периодами ТО
 */

const express = require('express');
const router = express.Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const OperatingHours = require('../models/operatingHours');

router.use(authenticate);

/**
 * @route GET /api/equipment/:equipmentId/operating-hours
 * @description Получить наработку оборудования с интервалами ТО
 */
router.get('/:equipmentId/operating-hours', requirePermission('equipment', 'view'), async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const data = await OperatingHours.getWithIntervals(equipmentId);
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
 * @route PUT /api/equipment/:equipmentId/operating-hours
 * @description Создать или обновить наработку оборудования
 */
router.put('/:equipmentId/operating-hours', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const {
      unit,
      currentValue,
      inputDate,
      assignedTo,
      autoCreateTasks,
      preventDecrease
    } = req.body;

    const data = await OperatingHours.upsert({
      equipmentId,
      companyId: req.user.companyId,
      unit,
      currentValue,
      inputDate,
      assignedTo,
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
 * @route DELETE /api/equipment/:equipmentId/operating-hours
 * @description Удалить наработку оборудования
 */
router.delete('/:equipmentId/operating-hours', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const { equipmentId } = req.params;
    await OperatingHours.delete(equipmentId);
    res.json({ success: true, message: 'Operating hours deleted' });
  } catch (err) {
    console.error('Error deleting operating hours:', err);
    res.status(500).json({ error: 'Failed to delete operating hours' });
  }
});

/**
 * @route POST /api/operating-hours/:operatingHoursId/intervals
 * @description Добавить интервал ТО
 */
router.post('/operating-hours/:operatingHoursId/intervals', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const { operatingHoursId } = req.params;
    const { intervalValue, lastMaintenanceValue, description } = req.body;

    const data = await OperatingHours.addInterval({
      operatingHoursId,
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

/**
 * @route PUT /api/operating-hours/intervals/:intervalId
 * @description Обновить интервал ТО
 */
router.put('/operating-hours/intervals/:intervalId', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const { intervalId } = req.params;
    const { intervalValue, lastMaintenanceValue, description } = req.body;

    const data = await OperatingHours.updateInterval(intervalId, {
      intervalValue,
      lastMaintenanceValue,
      description
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error updating interval:', err);
    res.status(500).json({ error: 'Failed to update interval' });
  }
});

/**
 * @route DELETE /api/operating-hours/intervals/:intervalId
 * @description Удалить интервал ТО
 */
router.delete('/operating-hours/intervals/:intervalId', requirePermission('equipment', 'edit'), async (req, res) => {
  try {
    const { intervalId } = req.params;
    await OperatingHours.deleteInterval(intervalId);
    res.json({ success: true, message: 'Interval deleted' });
  } catch (err) {
    console.error('Error deleting interval:', err);
    res.status(500).json({ error: 'Failed to delete interval' });
  }
});

module.exports = router;
