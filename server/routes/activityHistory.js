const express = require('express');
const { requirePermission } = require('../middleware/auth');
const ActivityHistory = require('../models/activityHistory');

const router = express.Router();
router.use(requirePermission('settings', 'view'));

router.get('/changes', async (req, res) => {
  try {
    res.json(await ActivityHistory.listAudit(req.user.companyId, req.query));
  } catch (error) {
    console.error('Audit history error:', error);
    res.status(500).json({ error: 'Не удалось получить историю изменений' });
  }
});

router.get('/logins', async (req, res) => {
  try {
    res.json(await ActivityHistory.listLogins(req.user.companyId, req.query));
  } catch (error) {
    console.error('Login history error:', error);
    res.status(500).json({ error: 'Не удалось получить историю входов' });
  }
});

module.exports = router;
