const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../models/user');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const perm = req.user.permissions[resource];

    if (perm === undefined || perm === null || perm === 'none') {
      return res.status(403).json({ error: 'Нет доступа к этому ресурсу' });
    }

    if (typeof perm === 'boolean') {
      if (!perm) return res.status(403).json({ error: 'Нет доступа к этому ресурсу' });
      return next();
    }

    if (typeof perm === 'string') {
      if (perm === 'full') return next();
      if (perm === 'view') {
        if (action === 'view') return next();
        return res.status(403).json({ error: 'Нет прав на редактирование' });
      }
      return res.status(403).json({ error: 'Нет доступа к этому ресурсу' });
    }

    return res.status(403).json({ error: 'Некорректные права доступа' });
  };
}

module.exports = { authenticate, requireRole, requirePermission };
