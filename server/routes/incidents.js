/**
 * @module Маршруты инцидентов (поломок)
 */

const express = require('express');
const router = express.Router();
const Incident = require('../models/incident');
const IncidentAction = require('../models/incidentAction');
const Notification = require('../models/notification');
const Equipment = require('../models/equipment');
const WorkOrder = require('../models/workOrder');
const { authenticate, requirePermission } = require('../middleware/auth');
const { incidentUpload } = require('../utils/upload');

function enrichIncident(inc, eqMap) {
  let photos = inc.photos;
  if (typeof photos === 'string') {
    try { photos = JSON.parse(photos); } catch (_) { photos = []; }
  }
  const eq = eqMap ? eqMap[inc.equipmentId] : null;
  return {
    ...inc,
    photos,
    equipmentName: eq ? eq.name : inc.equipmentName || null,
    inventoryNumber: eq ? eq.inventoryNumber : inc.inventoryNumber || null,
  };
}

async function validateRcaRequirements(incident, updateData, companyId) {
  const nextStatus = updateData.status || incident.status;
  const requiresRca = updateData.requiresRca !== undefined ? updateData.requiresRca : incident.requiresRca;
  const rootCauseNotes = updateData.rootCauseNotes !== undefined
    ? updateData.rootCauseNotes
    : incident.rootCauseNotes;
  const causeId = updateData.causeId !== undefined ? updateData.causeId : incident.causeId;

  if (nextStatus === 'resolved' && !causeId) {
    return 'Укажите причину возникновения перед закрытием инцидента';
  }

  if (requiresRca && (nextStatus === 'rca_done' || nextStatus === 'resolved')) {
    if (!rootCauseNotes || !String(rootCauseNotes).trim()) {
      return 'Заполните коренную причину (RCA) перед завершением расследования';
    }
    const actionCount = await IncidentAction.countByIncidentId(incident.id, companyId);
    const workOrders = await Incident.findWorkOrders(incident.id, companyId);
    if (actionCount === 0 && workOrders.length === 0) {
      return 'Добавьте корректирующее мероприятие или создайте наряд на ремонт';
    }
  }

  return null;
}

async function maybeRestoreEquipmentStatus(equipmentId, companyId, excludeIncidentId) {
  const openCount = await Incident.countOpenByEquipment(equipmentId, companyId, excludeIncidentId);
  if (openCount === 0) {
    const equipment = await Equipment.findById(equipmentId, companyId);
    if (equipment && equipment.status === 'needs_repair') {
      await Equipment.update(equipmentId, { status: 'working' }, companyId);
    }
  }
}

router.post('/', authenticate, incidentUpload.array('photos', 5), async (req, res) => {
  try {
    const {
      equipmentId, description, employeeName, commonFaultId, causeId,
      requiresRca, downtimeHours, lossAmount,
    } = req.body;
    const photos = req.files ? req.files.map((f) => f.filename) : [];

    const incident = await Incident.create({
      equipmentId,
      employeeId: req.user.id,
      employeeName,
      description,
      photos,
      commonFaultId: commonFaultId || null,
      causeId: causeId || null,
      requiresRca: requiresRca === 'true' || requiresRca === true,
      downtimeHours: downtimeHours ? Number(downtimeHours) : null,
      lossAmount: lossAmount ? Number(lossAmount) : null,
    }, req.user.companyId);

    const equipment = await Equipment.findById(equipmentId, req.user.companyId);
    if (equipment) {
      await Equipment.update(equipmentId, { status: 'needs_repair' }, req.user.companyId);
    }

    const User = require('../models/user');
    const allUsers = await User.findAllByCompany(req.user.companyId);
    const admins = allUsers.filter((u) => {
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
        incidentId: incident.id,
      });
    }

    res.status(201).json(incident);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/', requirePermission('incidents', 'view'), async (req, res) => {
  try {
    let incidents = await Incident.findAll(req.user.companyId);
    const { status, equipmentId, requiresRca } = req.query;

    if (status) incidents = incidents.filter((i) => i.status === status);
    if (equipmentId) incidents = incidents.filter((i) => i.equipmentId === equipmentId);
    if (requiresRca === 'true') incidents = incidents.filter((i) => i.requiresRca);

    const equipment = await Equipment.findAll(req.user.companyId);
    const eqMap = {};
    equipment.forEach((e) => { eqMap[e.id] = e; });

    res.json(incidents.map((inc) => enrichIncident(inc, eqMap)));
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id, req.user.companyId);
    if (!incident) return res.status(404).json({ error: 'Not found' });

    const equipment = await Equipment.findById(incident.equipmentId, req.user.companyId);
    const actions = await IncidentAction.findByIncidentId(incident.id, req.user.companyId);
    const workOrders = await Incident.findWorkOrders(incident.id, req.user.companyId);

    res.json({
      ...enrichIncident(incident, equipment ? { [equipment.id]: equipment } : {}),
      actions,
      workOrders,
    });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/:id', requirePermission('incidents', 'edit'), async (req, res) => {
  try {
    const existing = await Incident.findById(req.params.id, req.user.companyId);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const allowedFields = [
      'status', 'adminNotes', 'causeId', 'commonFaultId', 'rootCauseNotes',
      'assignedInvestigatorId', 'requiresRca', 'whys', 'downtimeHours', 'lossAmount',
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    if (updateData.whys && typeof updateData.whys === 'string') {
      try { updateData.whys = JSON.parse(updateData.whys); } catch (_) { updateData.whys = []; }
    }

    const validationError = await validateRcaRequirements(existing, updateData, req.user.companyId);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (updateData.status === 'resolved') {
      updateData.resolvedAt = new Date().toISOString();
    }

    const incident = await Incident.update(req.params.id, updateData, req.user.companyId);
    if (!incident) return res.status(404).json({ error: 'Not found' });

    if (updateData.status === 'resolved') {
      await maybeRestoreEquipmentStatus(incident.equipmentId, req.user.companyId, incident.id);
      if (incident.employeeId) {
        await Notification.create({
          userId: incident.employeeId,
          type: 'incident_resolved',
          title: 'Инцидент закрыт',
          message: 'Инцидент по оборудованию решён',
          equipmentId: incident.equipmentId,
          incidentId: incident.id,
        });
      }
    }

    res.json(incident);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/:id/create-work-order', requirePermission('workOrders', 'edit'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id, req.user.companyId);
    if (!incident) return res.status(404).json({ error: 'Not found' });

    const { taskName, notes, dueDate } = req.body;
    const workOrder = await WorkOrder.create({
      equipmentId: incident.equipmentId,
      taskName: taskName || `Ремонт: ${incident.description.substring(0, 80)}`,
      notes: notes || incident.description,
      status: 'pending',
      causeId: incident.causeId || null,
      dueDate: dueDate || null,
      incidentId: incident.id,
    }, req.user.companyId);

    if (incident.status === 'new') {
      await Incident.update(incident.id, { status: 'in_progress' }, req.user.companyId);
    }

    res.status(201).json(workOrder);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/:id/actions', requirePermission('incidents', 'view'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id, req.user.companyId);
    if (!incident) return res.status(404).json({ error: 'Not found' });
    const actions = await IncidentAction.findByIncidentId(req.params.id, req.user.companyId);
    res.json(actions);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/:id/actions', requirePermission('incidents', 'edit'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id, req.user.companyId);
    if (!incident) return res.status(404).json({ error: 'Not found' });

    const { description, assignedEmployeeId, dueDate, status } = req.body;
    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'Укажите описание мероприятия' });
    }

    const action = await IncidentAction.create({
      incidentId: incident.id,
      description: description.trim(),
      assignedEmployeeId: assignedEmployeeId || null,
      dueDate: dueDate || null,
      status: status || 'planned',
    }, req.user.companyId);

    res.status(201).json(action);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/:id/actions/:actionId', requirePermission('incidents', 'edit'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id, req.user.companyId);
    if (!incident) return res.status(404).json({ error: 'Not found' });

    const allowed = ['description', 'assignedEmployeeId', 'dueDate', 'status', 'workOrderId'];
    const updateData = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    const action = await IncidentAction.update(req.params.actionId, updateData, req.user.companyId);
    if (!action || action.incidentId !== incident.id) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(action);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

router.delete('/:id/actions/:actionId', requirePermission('incidents', 'edit'), async (req, res) => {
  try {
    const action = await IncidentAction.findById(req.params.actionId, req.user.companyId);
    if (!action || action.incidentId !== req.params.id) {
      return res.status(404).json({ error: 'Not found' });
    }
    await IncidentAction.remove(req.params.actionId, req.user.companyId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

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
