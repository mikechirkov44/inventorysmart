/**
 * @module Маршруты пользователей
 * @description API для управления учётными записями пользователей: получение списка,
 * просмотр по ID, создание, обновление и удаление.
 * Все маршруты требуют аутентификации и разрешения settings:edit.
 */

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate, requirePermission('settings', 'edit'));

/**
 * @route GET /users
 * @description Получение списка всех пользователей
 * @requires authenticate
 * @requires permission settings:edit
 * @returns {Object[]} Список пользователей
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.json([]);
    }
    const users = await User.findAllByCompany(companyId);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /users/:id
 * @description Получение пользователя по идентификатору
 * @requires authenticate
 * @requires permission settings:edit
 * @param {string} req.params.id - Идентификатор пользователя
 * @returns {Object} Данные пользователя
 * @returns {404} Если пользователь не найден
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /users
 * @description Создание нового пользователя
 * @requires authenticate
 * @requires permission settings:edit
 * @param {Object} req.body
 * @param {string} req.body.username - Логин (обязательно)
 * @param {string} req.body.password - Пароль (обязательно)
 * @param {string} [req.body.fullName] - Полное имя
 * @param {string} [req.body.positionId] - Идентификатор должности
 * @param {string} [req.body.employeeId] - Идентификатор связанного сотрудника
 * @returns {Object} Созданный пользователь (201)
 * @returns {409} Если логин уже занят
 */
router.post('/', async (req, res) => {
  try {
    const { username, password, fullName, positionId, employeeId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.create({ username, password, fullName, positionId, employeeId });
    if (!user) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /users/:id
 * @description Обновление данных пользователя (имя, должность, сотрудник, пароль)
 * @requires authenticate
 * @requires permission settings:edit
 * @param {string} req.params.id - Идентификатор пользователя
 * @param {Object} req.body - Обновлённые данные
 * @param {string} [req.body.fullName] - Полное имя
 * @param {string} [req.body.positionId] - Идентификатор должности
 * @param {string} [req.body.employeeId] - Идентификатор сотрудника
 * @param {string} [req.body.password] - Новый пароль
 * @returns {Object} Обновлённый пользователь
 * @returns {404} Если пользователь не найден
 */
router.put('/:id', async (req, res) => {
  try {
    const { fullName, positionId, employeeId, password } = req.body;
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (positionId !== undefined) updateData.positionId = positionId;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (password) updateData.password = password;

    const user = await User.update(req.params.id, updateData);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route DELETE /users/:id
 * @description Удаление пользователя (нельзя удалить самого себя)
 * @requires authenticate
 * @requires permission settings:edit
 * @param {string} req.params.id - Идентификатор пользователя
 * @returns {Object} Сообщение об успешном удалении
 * @returns {400} Если пытаетесь удалить себя
 * @returns {404} Если пользователь не найден
 */
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    const deleted = await User.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
