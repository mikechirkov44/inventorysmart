/**
 * @module Маршруты авторизации
 * @description API для аутентификации пользователей: вход, получение данных текущего пользователя,
 * смена пароля. Управление JWT-токенами.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { authenticate } = require('../middleware/auth');

/**
 * @route POST /auth/login
 * @description Аутентификация пользователя и получение JWT-токена
 * @param {Object} req.body - Данные для входа
 * @param {string} req.body.username - Логин пользователя
 * @param {string} req.body.password - Пароль пользователя
 * @returns {Object} Объект с токеном и данными пользователя
 * @returns {string} return.token - JWT-токен для доступа
 * @returns {Object} return.user - Данные пользователя (id, username, fullName, role, positionId, permissions)
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findByUsername(username);
    if (!user || !User.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
        permissions
      },
      User.JWT_SECRET,
      { expiresIn: User.JWT_EXPIRES }
    );

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
        permissions
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      ...user,
      permissions: req.user.permissions || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /auth/change-password
 * @description Смена пароля текущего пользователя
 * @requires authenticate
 * @param {Object} req.body - Данные для смены пароля
 * @param {string} req.body.currentPassword - Текущий пароль
 * @param {string} req.body.newPassword - Новый пароль (минимум 6 символов)
 * @returns {Object} Сообщение об успешной смене пароля
 */
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });
    }

    const user = await User.findByUsername(req.user.username);
    if (!user || !User.verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }

    await User.update(req.user.id, { password: newPassword });

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
