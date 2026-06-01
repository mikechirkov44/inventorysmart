const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');

router.get('/', async (req, res) => {
  try {
    const required = await User.isSetupRequired();
    res.json({ setupRequired: required });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!(await User.isSetupRequired())) {
      return res.status(400).json({ error: 'Admin account already exists' });
    }

    const { username, password, fullName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.create({
      username,
      password,
      fullName: fullName || 'Администратор',
      role: 'admin'
    });

    if (!user) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
      User.JWT_SECRET,
      { expiresIn: User.JWT_EXPIRES }
    );

    res.status(201).json({ token, user, message: 'Admin account created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
