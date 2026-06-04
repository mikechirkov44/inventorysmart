/**
 * @module Маршруты начальной настройки
 * @description API для первоначальной настройки системы: проверка необходимости настройки
 * и создание первого учётного записи администратора.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Position = require('../models/position');

/**
 * @route GET /setup
 * @description Проверка, требуется ли начальная настройка системы (есть ли учётные записи)
 * @returns {Object} Флаг необходимости настройки
 * @returns {boolean} return.setupRequired
 */
router.get('/', async (req, res) => {
  try {
    const required = await User.isSetupRequired();
    res.json({ setupRequired: required });
  } catch (error) {
    console.error('Setup check error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /setup
 * @description Создание первого учётного записи администратора (начальная настройка)
 * @param {Object} req.body
 * @param {string} req.body.username - Логин администратора
 * @param {string} req.body.password - Пароль (минимум 8 символов, буквы + цифры)
 * @param {string} [req.body.fullName] - Полное имя (по умолчанию "Администратор")
 * @returns {Object} JWT-токен и данные созданного пользователя (201)
 * @returns {400} Если администратор уже существует
 */
router.post('/', async (req, res) => {
  try {
    if (!(await User.isSetupRequired())) {
      return res.status(400).json({ error: 'Учётная запись уже создана' });
    }

    const { username, password, fullName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' });
    }
    if (!/[a-zA-Zа-яА-Я]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Пароль должен содержать буквы и цифры' });
    }

    const adminPosition = await Position.findByName('Администратор');

    const user = await User.create({
      username,
      password,
      fullName: fullName || 'Администратор',
      positionId: adminPosition ? adminPosition.id : null
    });

    if (!user) {
      return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
    }

    const permissions = adminPosition ? adminPosition.permissions : {};

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        fullName: user.fullName || user.full_name,
        positionId: user.positionId,
        positionName: 'Администратор',
        permissions
      },
      User.JWT_SECRET,
      { expiresIn: User.JWT_EXPIRES }
    );

    res.status(201).json({ token, user: { ...user, positionName: 'Администратор', permissions }, message: 'Admin account created successfully' });
  } catch (error) {
    console.error('Setup create error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
