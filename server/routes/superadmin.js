const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES } = require('../models/user');
const { authenticate } = require('../middleware/auth');
const { requireSuperadmin } = require('../middleware/auth');
const SuperAdmin = require('../models/superadmin');

// Superadmin login (separate from regular auth)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }

    const user = await SuperAdmin.findUserByUsername(username);
    if (!user || user.role !== 'superadmin') {
      return res.status(401).json({ error: 'Неверные учётные данные' });
    }

    const bcrypt = require('bcryptjs');
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Неверные учётные данные' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: 'superadmin',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: 'superadmin',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// All routes below require authentication + superadmin role
router.use(authenticate, requireSuperadmin);

router.get('/companies', async (req, res) => {
  try {
    const companies = await SuperAdmin.getCompanies();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await SuperAdmin.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/companies', async (req, res) => {
  try {
    const { companyName } = req.body;
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Введите название компании' });
    }
    const company = await SuperAdmin.createCompany(companyName.trim());
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-license', async (req, res) => {
  try {
    const { companyId, plan, daysValid } = req.body;
    if (!companyId) {
      return res.status(400).json({ error: 'Выберите компанию' });
    }
    if (!plan || !plan.trim()) {
      return res.status(400).json({ error: 'Укажите название плана' });
    }
    if (!daysValid || daysValid <= 0) {
      return res.status(400).json({ error: 'Укажите срок действия в днях' });
    }

    const key = SuperAdmin.generateLicenseKey(companyId, plan.trim(), parseInt(daysValid));
    await SuperAdmin.updateLicense(companyId, key);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(daysValid));

    res.json({
      key,
      plan: plan.trim(),
      expiresAt: expiresAt.toISOString().split('T')[0],
      companyId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
