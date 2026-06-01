const express = require('express');
const router = express.Router();
const SparePart = require('../models/sparePart');

router.get('/', async (req, res) => {
  try {
    let items = await SparePart.findAll();
    const { search, equipmentId } = req.query;
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(s) ||
        (i.article && i.article.toLowerCase().includes(s)) ||
        (i.manufacturer && i.manufacturer.toLowerCase().includes(s))
      );
    }
    if (equipmentId) {
      items = items.filter(i => (i.equipmentIds || []).includes(equipmentId));
    }
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await SparePart.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const item = await SparePart.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await SparePart.update(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await SparePart.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/replenish', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const updated = await SparePart.replenishStock(items);
    res.json({ updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
