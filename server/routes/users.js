const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate, requirePermission('settings', 'edit'));

router.get('/', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, password, fullName, positionId, employeeId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.create({ username, password, fullName, positionId, employeeId });
    if (!user) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { fullName, positionId, employeeId, password } = req.body;
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (positionId !== undefined) updateData.positionId = positionId;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (password) updateData.password = password;

    const user = await User.update(req.params.id, updateData);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    const deleted = await User.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
