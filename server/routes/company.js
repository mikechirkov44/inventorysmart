const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Company = require('../models/company');
const { authenticate, requirePermission } = require('../middleware/auth');

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

router.get('/', authenticate, async (req, res) => {
  try {
    const company = await Company.get();
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', authenticate, requirePermission('settings', 'edit'), upload.single('logo'), async (req, res) => {
  try {
    const data = {};
    if (req.body.companyName !== undefined) data.companyName = req.body.companyName;
    if (req.body.timezone !== undefined) data.timezone = req.body.timezone;
    if (req.body.allowInspectionWithoutQr !== undefined) {
      data.allowInspectionWithoutQr = req.body.allowInspectionWithoutQr === 'true' || req.body.allowInspectionWithoutQr === true;
    }
    if (req.file) {
      data.logo = req.file.filename;
    }

    const company = await Company.update(data);
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/activate-license', authenticate, requirePermission('settings', 'edit'), async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || !key.trim()) {
      return res.status(400).json({ error: 'Введите лицензионный ключ' });
    }

    let decoded;
    try {
      const json = Buffer.from(key.trim(), 'base64').toString('utf-8');
      decoded = JSON.parse(json);
    } catch {
      return res.status(400).json({ error: 'Неверный формат лицензионного ключа' });
    }

    if (!decoded.plan || !decoded.expiresAt) {
      return res.status(400).json({ error: 'Неверный формат лицензионного ключа' });
    }

    const expiresDate = new Date(decoded.expiresAt);
    if (isNaN(expiresDate.getTime())) {
      return res.status(400).json({ error: 'Неверная дата окончания лицензии' });
    }

    if (expiresDate < new Date()) {
      return res.status(400).json({ error: 'Срок действия лицензии истёк' });
    }

    await Company.update({ licenseKey: key.trim() });

    res.json({
      plan: decoded.plan,
      expiresAt: decoded.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
