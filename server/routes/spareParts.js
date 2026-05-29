const express = require('express');
const router = express.Router();
const SparePart = require('../models/sparePart');

router.get('/', (req, res) => {
  try {
    let items = SparePart.findAll();
    const { search } = req.query;
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(s) ||
        (i.article && i.article.toLowerCase().includes(s)) ||
        (i.manufacturer && i.manufacturer.toLowerCase().includes(s))
      );
    }
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const item = SparePart.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const item = SparePart.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const item = SparePart.update(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const deleted = SparePart.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
