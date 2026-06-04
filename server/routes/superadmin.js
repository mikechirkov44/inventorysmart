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
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /superadmin/companies/:companyId
 * @description Обновление названия компании
 */
router.put('/companies/:companyId', async (req, res) => {
  try {
    const { companyName } = req.body;
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Введите название компании' });
    }
    const company = await SuperAdmin.updateCompany(req.params.companyId, companyName.trim());
    if (!company) {
      return res.status(404).json({ error: 'Компания не найдена' });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route DELETE /superadmin/companies/:companyId
 * @description Удаление компании
 */
router.delete('/companies/:companyId', async (req, res) => {
  try {
    const deleted = await SuperAdmin.deleteCompany(req.params.companyId);
    if (!deleted) {
      return res.status(404).json({ error: 'Компания не найдена' });
    }
    res.json({ message: 'Компания удалена' });
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' });
    }
    if (!/[a-zA-Zа-яА-Я]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Пароль должен содержать буквы и цифры' });
    }
    if (!companyId) {
      return res.status(400).json({ error: 'Выберите компанию (портал)' });
    }

    let effectivePositionId = positionId || null;
    if (!effectivePositionId) {
      const { rows } = await require('../db').query(
        "SELECT id FROM positions WHERE name = 'Администратор' LIMIT 1"
      );
      effectivePositionId = rows[0]?.id || null;
    }

    const user = await SuperAdmin.createUser({
      username: username.trim(),
      password,
      fullName: fullName ? fullName.trim() : username.trim(),
      companyId,
      positionId: effectivePositionId,
    });

    if (!user) {
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /superadmin/users/:userId
 * @description Обновление пользователя суперадминистратором
 */
router.put('/users/:userId', async (req, res) => {
  try {
    const { fullName, companyId, positionId, password } = req.body;
    const userId = req.params.userId;

    // Verify user exists
    const existingUser = await require('../db').query('SELECT id, username FROM users WHERE id = $1', [userId]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const updates = {};
    if (fullName !== undefined) updates.full_name = fullName.trim();
    if (companyId !== undefined) updates.company_id = companyId || null;
    if (positionId !== undefined) updates.position_id = positionId || null;
    
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' });
      }
      if (!/[a-zA-Zа-яА-Я]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({ error: 'Пароль должен содержать буквы и цифры' });
      }
      const bcrypt = require('bcryptjs');
      updates.password_hash = bcrypt.hashSync(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    const keys = Object.keys(updates);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const vals = keys.map(k => updates[k]);
    vals.push(userId);

    const { rows } = await require('../db').query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id, username, full_name, role, company_id, position_id`,
      vals
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route DELETE /superadmin/users/:userId
 * @description Удаление пользователя суперадминистратором
 */
router.delete('/users/:userId', async (req, res) => {
  try {
    const deleted = await SuperAdmin.deleteUser(req.params.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Пользователь не найден или является суперадминистратором' });
    }
    res.json({ message: 'Пользователь удалён' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /superadmin/companies/:companyId/stats
 * @description Получение статистики по компании для суперадминистратора
 */
router.get('/companies/:companyId/stats', async (req, res) => {
  try {
    const { companyId } = req.params;
    console.log('Stats request for companyId:', companyId);
    const { query } = require('../db');

    // Verify company exists
    const companies = await SuperAdmin.getCompanies();
    const found = companies.find(c => c.companyId === companyId);
    if (!found) {
      return res.status(404).json({ error: 'Компания не найдена' });
    }

    // Get counts from all tables
    const [equipRes, empRes, worksRes, roomsRes, spareRes, ordersRes, incidentsRes, usersRes, receiptsRes] = await Promise.all([
      query('SELECT COUNT(*)::int as count FROM equipment WHERE company_id = $1', [companyId]),
      query('SELECT COUNT(*)::int as count FROM employees WHERE company_id = $1', [companyId]),
      query('SELECT COUNT(*)::int as count FROM works WHERE company_id = $1', [companyId]),
      query('SELECT COUNT(*)::int as count FROM rooms WHERE company_id = $1', [companyId]),
      query('SELECT COUNT(*)::int as count FROM spare_parts WHERE company_id = $1', [companyId]),
      query('SELECT COUNT(*)::int as count FROM work_orders WHERE company_id = $1', [companyId]),
      query('SELECT COUNT(*)::int as count FROM incidents WHERE company_id = $1', [companyId]),
      query("SELECT COUNT(*)::int as count FROM users WHERE company_id = $1 AND role != 'superadmin'", [companyId]),
      query('SELECT COUNT(*)::int as count FROM spare_part_receipts WHERE company_id = $1', [companyId]),
    ]);

    // Get pending work orders
    const pendingRes = await query(
      "SELECT COUNT(*)::int as count FROM work_orders WHERE company_id = $1 AND status != 'completed'",
      [companyId]
    );

    // Get license status
    const Company = require('../models/company');
    const license = await Company.getLicenseStatus(companyId);

    res.json({
      companyId,
      companyName: found.companyName,
      counts: {
        equipment: equipRes.rows[0].count,
        employees: empRes.rows[0].count,
        works: worksRes.rows[0].count,
        rooms: roomsRes.rows[0].count,
        spareParts: spareRes.rows[0].count,
        workOrders: ordersRes.rows[0].count,
        incidents: incidentsRes.rows[0].count,
        users: usersRes.rows[0].count,
        sparePartsReceipts: receiptsRes.rows[0].count,
      },
      pendingWorkOrders: pendingRes.rows[0].count,
      license,
      createdAt: found.createdAt,
    });
  } catch (error) {
    console.error('Company stats error:', error.message, error.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
