/**
 * @module auth
 * @description Middleware для JWT-аутентификации и проверки прав доступа
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../models/user');

/**
 * Проверяет JWT-токен из заголовка Authorization и декодирует
 * данные пользователя в req.user
 * @param {import('express').Request} req - Объект запроса Express
 * @param {import('express').Response} res - Объект ответа Express
 * @param {import('express').NextFunction} next - Функция передачи управления дальше
 * @returns {void}
 */
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

/**
 * Фабрика middleware, проверяющего наличие у пользователя права
 * на указанное действие (view / edit / full) над ресурсом
 * @param {string} resource - Идентификатор ресурса (equipment, works, rooms и т.д.)
 * @param {string} action - Требуемое действие ('view' или 'edit')
 * @returns {import('express').RequestHandler} Middleware-функция Express
 */
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

/**
 * Middleware, разрешающее доступ только пользователям с ролью superadmin
 * @param {import('express').Request} req - Объект запроса Express
 * @param {import('express').Response} res - Объект ответа Express
 * @param {import('express').NextFunction} next - Функция передачи управления дальше
 * @returns {void}
 */
function requireSuperadmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  next();
}

module.exports = { authenticate, requirePermission, requireSuperadmin };
