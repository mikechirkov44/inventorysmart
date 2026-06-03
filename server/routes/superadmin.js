/**
 * @module Маршруты суперадминистратора
 * @description API для управления порталом на уровне суперадминистратора:
 * вход в систему, управление компаниями, генерация лицензий, создание пользователей.
 * Все маршруты (кроме login) требуют аутентификации и роли superadmin.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES } = require('../models/user');
const { authenticate } = require('../middleware/auth');
const { requireSuperadmin } = require('../middleware/auth');
const SuperAdmin = require('../models/superadmin');

/**
 * @route POST /superadmin/login
 * @description Аутентификация суперадминистратора (отдельно от обычной авторизации)
 * @param {Object} req.body
 * @param {string} req.body.username - Логин суперадминистратора
 * @param {string} req.body.password - Пароль
 * @returns {Object} JWT-токен и данные пользователя
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }

    const user = await SuperAdmin.findUserByUsername(username);
    if (!user || user.role !== 'superadmin') {
      return res.status(401).json({ error: 'Неверные учётные данные' });
    }

    const bcrypt = require('bcryptjs');
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Неверные учётные данные' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: 'superadmin',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: 'superadmin',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// All routes below require authentication + superadmin role
router.use(authenticate, requireSuperadmin);

/**
 * @route GET /superadmin/companies
 * @description Получение списка всех компаний портала
 * @requires authenticate
 * @requires role superadmin
 * @returns {Object[]} Список компаний
 */
router.get('/companies', async (req, res) => {
  try {
    const companies = await SuperAdmin.getCompanies();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /superadmin/users
 * @description Получение списка всех пользователей всех компаний
 * @requires authenticate
 * @requires role superadmin
 * @returns {Object[]} Список пользователей
 */
router.get('/users', async (req, res) => {
  try {
    const users = await SuperAdmin.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /superadmin/companies
 * @description Создание новой компании
 * @requires authenticate
 * @requires role superadmin
 * @param {Object} req.body
 * @param {string} req.body.companyName - Название компании
 * @returns {Object} Созданная компания
 */
router.post('/companies', async (req, res) => {
  try {
    const { companyName } = req.body;
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Введите название компании' });
    }
    const company = await SuperAdmin.createCompany(companyName.trim());
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /superadmin/generate-license
 * @description Генерация лицензионного ключа для компании
 * @requires authenticate
 * @requires role superadmin
 * @param {Object} req.body
 * @param {string} req.body.companyId - Идентификатор компании
 * @param {string} req.body.plan - Название плана (например, "Pro")
 * @param {number} req.body.daysValid - Срок действия в днях
 * @returns {Object} Лицензионный ключ и информация о лицензии
 */
router.post('/generate-license', async (req, res) => {
  try {
    const { companyId, plan, daysValid } = req.body;
    if (!companyId) {
      return res.status(400).json({ error: 'Выберите компанию' });
    }
    if (!plan || !plan.trim()) {
      return res.status(400).json({ error: 'Укажите название плана' });
    }
    if (!daysValid || daysValid <= 0) {
      return res.status(400).json({ error: 'Укажите срок действия в днях' });
    }

    const key = SuperAdmin.generateLicenseKey(companyId, plan.trim(), parseInt(daysValid));
    await SuperAdmin.updateLicense(companyId, key);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(daysValid));

    res.json({
      key,
      plan: plan.trim(),
      expiresAt: expiresAt.toISOString().split('T')[0],
      companyId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /superadmin/users
 * @description Создание пользователя для указанной компании
 * @requires authenticate
 * @requires role superadmin
 * @param {Object} req.body
 * @param {string} req.body.username - Логин пользователя
 * @param {string} req.body.password - Пароль (минимум 6 символов)
 * @param {string} [req.body.fullName] - Полное имя
 * @param {string} req.body.companyId - Идентификатор компании
 * @param {string} [req.body.positionId] - Идентификатор должности
 * @returns {Object} Созданный пользователь
 */
router.post('/users', async (req, res) => {
  try {
    const { username, password, fullName, companyId, positionId } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Введите логин' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }
    if (!companyId) {
      return res.status(400).json({ error: 'Выберите компанию (портал)' });
    }

    const user = await SuperAdmin.createUser({
      username: username.trim(),
      password,
      fullName: fullName ? fullName.trim() : username.trim(),
      companyId,
      positionId: positionId || null,
    });

    if (!user) {
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
