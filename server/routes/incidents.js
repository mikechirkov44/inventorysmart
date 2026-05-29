const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Incident = require('../models/incident');
const Notification = require('../models/notification');
const Equipment = require('../models/equipment');
const { authenticate, requireRole } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, 'incident-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype));
  }
});

// POST /api/incidents - employee reports a failure
router.post('/', upload.array('photos', 5), (req, res) => {
  try {
    const { equipmentId, description, employeeName } = req.body;
    const photos = req.files ? req.files.map(f => f.filename) : [];

    const incident = Incident.create({
      equipmentId,
      employeeId: req.user.id,
      employeeName,
      description,
      photos
    });

    const equipment = Equipment.findById(equipmentId);
    if (equipment) {
      Equipment.update(equipmentId, { status: 'needs_repair' });
    }

    const admins = require('../models/user').findAll().filter(u => u.role === 'admin');
    admins.forEach(admin => {
      Notification.create({
        userId: admin.id,
        type: 'incident',
        title: 'Новая поломка',
        message: `${equipment ? equipment.name : 'Оборудование'}: ${description.substring(0, 100)}`,
        equipmentId,
        incidentId: incident.id
      });
    });

    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/incidents - admin sees all
router.get('/', requireRole('admin'), (req, res) => {
  try {
    let incidents = Incident.findAll();
    const { status, equipmentId } = req.query;

    if (status) incidents = incidents.filter(i => i.status === status);
    if (equipmentId) incidents = incidents.filter(i => i.equipmentId === equipmentId);

    const equipment = Equipment.findAll();
    const eqMap = {};
    equipment.forEach(e => { eqMap[e.id] = e; });

    const enriched = incidents.map(inc => ({
      ...inc,
      equipmentName: eqMap[inc.equipmentId] ? eqMap[inc.equipmentId].name : null,
      inventoryNumber: eqMap[inc.equipmentId] ? eqMap[inc.equipmentId].inventoryNumber : null,
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/incidents/:id
router.get('/:id', (req, res) => {
  try {
    const incident = Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Not found' });

    const equipment = Equipment.findById(incident.equipmentId);
    res.json({
      ...incident,
      equipmentName: equipment ? equipment.name : null,
      inventoryNumber: equipment ? equipment.inventoryNumber : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/incidents/:id - admin updates
router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const incident = Incident.update(req.params.id, updateData);
    if (!incident) return res.status(404).json({ error: 'Not found' });

    if (status === 'resolved' && incident.employeeId) {
      Notification.create({
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
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/incidents/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const deleted = Incident.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
