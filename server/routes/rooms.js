const express = require('express');
const router = express.Router();
const Room = require('../models/room');

router.get('/', async (req, res) => {
  try {
    let rooms = await Room.findAll();
    const { name, building, search } = req.query;

    if (search) {
      const s = search.toLowerCase();
      rooms = rooms.filter(r =>
        r.name.toLowerCase().includes(s) ||
        (r.description && r.description.toLowerCase().includes(s)) ||
        (r.building && r.building.toLowerCase().includes(s))
      );
    }
    if (name) {
      rooms = rooms.filter(r => r.name.toLowerCase().includes(name.toLowerCase()));
    }
    if (building) {
      rooms = rooms.filter(r => r.building === building);
    }

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const room = await Room.update(req.params.id, req.body);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Room.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
