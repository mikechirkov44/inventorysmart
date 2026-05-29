const express = require('express');
const router = express.Router();
const { getCalendarEvents } = require('../utils/schedule');

// GET /api/calendar?month=4&year=2026 (month is 0-indexed)
router.get('/', (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    if (isNaN(month) || isNaN(year)) {
      return res.status(400).json({ error: 'month and year required' });
    }

    const events = getCalendarEvents(year, month);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
