const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const WorkOrder = require('../models/workOrder');

// Configure multer for file uploads
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

// GET all work orders
router.get('/', (req, res) => {
  try {
    const workOrders = WorkOrder.findAll();
    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET work order by ID
router.get('/:id', (req, res) => {
  try {
    const workOrder = WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    res.json(workOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET work orders by equipment ID
router.get('/equipment/:equipmentId', (req, res) => {
  try {
    const workOrders = WorkOrder.findByEquipmentId(req.params.equipmentId);
    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create work order
router.post('/', upload.array('photos', 10), (req, res) => {
  try {
    const workOrderData = req.body;
    if (req.files && req.files.length > 0) {
      workOrderData.photos = req.files.map(file => file.filename);
    }
    const workOrder = WorkOrder.create(workOrderData);
    res.status(201).json(workOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update work order
router.put('/:id', upload.array('photos', 10), (req, res) => {
  try {
    const workOrderData = req.body;
    if (req.files && req.files.length > 0) {
      const existingWorkOrder = WorkOrder.findById(req.params.id);
      const existingPhotos = existingWorkOrder ? existingWorkOrder.photos : [];
      workOrderData.photos = [...existingPhotos, ...req.files.map(file => file.filename)];
    }
    
    const workOrder = WorkOrder.update(req.params.id, workOrderData);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    res.json(workOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE work order
router.delete('/:id', (req, res) => {
  try {
    const deleted = WorkOrder.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    res.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
