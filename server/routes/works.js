const express = require('express');
const router = express.Router();
const Work = require('../models/work');

// GET all works with optional filtering
router.get('/', (req, res) => {
  try {
    let works = Work.findAll();
    const { name, category, search } = req.query;

    if (search) {
      const s = search.toLowerCase();
      works = works.filter(w =>
        w.name.toLowerCase().includes(s) ||
        (w.description && w.description.toLowerCase().includes(s))
      );
    }
    if (name) {
      works = works.filter(w => w.name.toLowerCase().includes(name.toLowerCase()));
    }
    if (category) {
      works = works.filter(w => w.category === category);
    }

    res.json(works);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET work by ID
router.get('/:id', (req, res) => {
  try {
    const work = Work.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }
    res.json(work);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create work
router.post('/', (req, res) => {
  try {
    const work = Work.create(req.body);
    res.status(201).json(work);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update work
router.put('/:id', (req, res) => {
  try {
    const work = Work.update(req.params.id, req.body);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }
    res.json(work);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE work
router.delete('/:id', (req, res) => {
  try {
    const deleted = Work.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Work not found' });
    }
    res.json({ message: 'Work deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
