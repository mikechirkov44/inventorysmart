const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const Equipment = require('../models/equipment');

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

// GET all equipment with optional filtering
router.get('/', (req, res) => {
  try {
    let equipment = Equipment.findAll();
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

// GET equipment by ID
router.get('/:id', (req, res) => {
  try {
    const equipment = Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET QR code for equipment
router.get('/:id/qr', async (req, res) => {
  try {
    const equipment = Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    const qrUrl = `${req.protocol}://${req.get('host')}/scan/${equipment.qrCode}`;
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

// POST create equipment
router.post('/', upload.single('photo'), (req, res) => {
  try {
    const equipmentData = req.body;
    if (req.file) {
      equipmentData.photo = req.file.filename;
    }
    
    if (typeof equipmentData.workIds === 'string') {
      equipmentData.workIds = JSON.parse(equipmentData.workIds);
    }
    
    const equipment = Equipment.create(equipmentData);
    res.status(201).json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update equipment
router.put('/:id', upload.single('photo'), (req, res) => {
  try {
    const equipmentData = req.body;
    if (req.file) {
      equipmentData.photo = req.file.filename;
    }
    
    if (typeof equipmentData.workIds === 'string') {
      equipmentData.workIds = JSON.parse(equipmentData.workIds);
    }
    
    const equipment = Equipment.update(req.params.id, equipmentData);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE equipment
router.delete('/:id', (req, res) => {
  try {
    const deleted = Equipment.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
