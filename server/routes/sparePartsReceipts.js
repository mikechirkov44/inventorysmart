const express = require('express');
const router = express.Router();
const SparePartReceipt = require('../models/sparePartReceipt');

router.get('/', async (req, res) => {
  try {
    const receipts = await SparePartReceipt.findAll();
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/next-number', async (req, res) => {
  try {
    const number = await SparePartReceipt.generateDocumentNumber();
    res.json({ number });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const receipt = await SparePartReceipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ error: 'Not found' });
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const receipt = await SparePartReceipt.create(req.body);
    res.status(201).json(receipt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await SparePartReceipt.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
