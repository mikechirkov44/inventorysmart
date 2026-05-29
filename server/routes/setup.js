const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// GET /api/setup - check if setup is required
router.get('/', (req, res) => {
  try {
    const required = User.isSetupRequired();
    res.json({ setupRequired: required });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/setup - create first admin account
router.post('/', (req, res) => {
  try {
    if (!User.isSetupRequired()) {
      return res.status(400).json({ error: 'Admin account already exists' });
    }

    const { username, password, fullName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = User.create({
      username,
      password,
      fullName: fullName || 'Администратор',
      role: 'admin'
    });

    if (!user) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
      User.JWT_SECRET,
      { expiresIn: User.JWT_EXPIRES }
    );

    res.status(201).json({ token, user, message: 'Admin account created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
