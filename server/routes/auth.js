/**
 * @module Маршруты авторизации
 * @description API для аутентификации пользователей: вход, получение данных текущего пользователя,
 * смена пароля. Управление JWT-токенами.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const ActivityHistory = require('../models/activityHistory');

function loginContext(req, overrides = {}) {
  return {
    username: String(req.body?.username || '').slice(0, 255),
    companyName: String(req.body?.companyName || '').slice(0, 255),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    ...overrides,
  };
}

async function recordLogin(req, overrides) {
  try {
    await ActivityHistory.recordLogin(loginContext(req, overrides));
  } catch (error) {
    console.error('Login history error:', error);
  }
}

/**
 * @route POST /auth/login
 * @description Аутентификация пользователя и получение JWT-токена
 * @param {Object} req.body - Данные для входа
 * @param {string} req.body.username - Логин пользователя
 * @param {string} req.body.password - Пароль пользователя
 * @param {string} req.body.companyName - Наименование компании
 * @returns {Object} Объект с токеном и данными пользователя
 * @returns {string} return.token - JWT-токен для доступа
 * @returns {Object} return.user - Данные пользователя (id, username, fullName, role, positionId, permissions, companyName)
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password, companyName } = req.body;
    if (!username || !password) {
      await recordLogin(req, { success: false, failureReason: 'missing_credentials' });
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }
    if (!companyName || !companyName.trim()) {
      await recordLogin(req, { success: false, failureReason: 'missing_company' });
      return res.status(400).json({ error: 'Введите наименование компании' });
    }

    const user = await User.findByUsername(username);
    if (!user || !User.verifyPassword(password, user.password_hash)) {
      await recordLogin(req, {
        companyId: user?.company_id,
        userId: user?.id,
        employeeId: user?.employee_id,
        success: false,
        failureReason: 'invalid_credentials',
      });
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }

    if (!user.company_id) {
      await recordLogin(req, { userId: user.id, employeeId: user.employee_id, success: false, failureReason: 'no_company' });
      return res.status(403).json({ error: 'Пользователь не привязан к компании' });
    }

    const { rows: companies } = await query(
      'SELECT company_name FROM company_settings WHERE company_id = $1',
      [user.company_id]
    );
    if (companies.length === 0) {
      await recordLogin(req, { companyId: user.company_id, userId: user.id, employeeId: user.employee_id, success: false, failureReason: 'company_not_found' });
      return res.status(403).json({ error: 'Компания пользователя не найдена' });
    }

    const actualCompanyName = companies[0].company_name;
    if (actualCompanyName.trim().toLowerCase() !== companyName.trim().toLowerCase()) {
      await recordLogin(req, { companyId: user.company_id, userId: user.id, employeeId: user.employee_id, success: false, failureReason: 'invalid_company' });
      return res.status(403).json({ error: 'Неверное наименование компании' });
    }

    const permissions = user.position_permissions
      ? (typeof user.position_permissions === 'string' ? JSON.parse(user.position_permissions) : user.position_permissions)
      : {};

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role || 'user',
        positionId: user.position_id,
        positionName: user.position_name,
        employeeId: user.employee_id,
        companyId: user.company_id,
        companyName: actualCompanyName,
        permissions
      },
      User.JWT_SECRET,
      { expiresIn: User.JWT_EXPIRES }
    );

    await recordLogin(req, {
      companyId: user.company_id,
      userId: user.id,
      employeeId: user.employee_id,
      companyName: actualCompanyName,
      success: true,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role || 'user',
        positionId: user.position_id,
        positionName: user.position_name,
        employeeId: user.employee_id,
        companyId: user.company_id,
        companyName: actualCompanyName,
        permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /auth/me
 * @description Получение данных текущего аутентифицированного пользователя
 * @requires authenticate
 * @returns {Object} Данные пользователя с разрешениями
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    let companyName = null;
    if (user.companyId) {
      const { rows } = await query(
        'SELECT company_name FROM company_settings WHERE company_id = $1',
        [user.companyId]
      );
      companyName = rows[0]?.company_name || null;
    }
    res.json({
      ...user,
      companyName,
      permissions: req.user.permissions || {}
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /auth/change-password
 * @description Смена пароля текущего пользователя
 * @requires authenticate
 * @param {Object} req.body - Данные для смены пароля
 * @param {string} req.body.currentPassword - Текущий пароль
 * @param {string} req.body.newPassword - Новый пароль (минимум 8 символов, буква+цифра)
 * @returns {Object} Сообщение об успешной смене пароля
 */
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' });
    }
    if (!/[a-zA-Zа-яА-Я]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Пароль должен содержать буквы и цифры' });
    }

    const user = await User.findByUsername(req.user.username);
    if (!user || !User.verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }

    await User.update(req.user.id, { password: newPassword });

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
