const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const WorkOrder = require('../models/workOrder');
const SparePart = require('../models/sparePart');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.get('/', async (req, res) => {
  try {
    const workOrders = await WorkOrder.findAll();
    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

router.get('/equipment/:equipmentId', async (req, res) => {
  try {
    const workOrders = await WorkOrder.findByEquipmentId(req.params.equipmentId);
    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', upload.array('photos', 10), async (req, res) => {
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

router.put('/:id', upload.array('photos', 10), async (req, res) => {
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
