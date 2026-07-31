const ActivityHistory = require('../models/activityHistory');

const ACTIONS = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

function auditChanges(req, res, next) {
  const action = ACTIONS[req.method];
  if (!action || !req.user?.companyId || req.path.startsWith('/activity-history')) return next();

  const parts = req.path.split('/').filter(Boolean);
  const resource = parts[0] || 'unknown';
  const resourceId = parts.length > 1 ? parts[1] : null;
  const changes = req.body;

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    ActivityHistory.recordAudit({
      companyId: req.user.companyId,
      userId: req.user.id,
      employeeId: req.user.employeeId,
      action,
      resource,
      resourceId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      changes,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }).catch((error) => console.error('Audit log error:', error));
  });
  next();
}

module.exports = { auditChanges };
