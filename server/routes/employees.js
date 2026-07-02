/**
 * @module Маршруты сотрудников
 * @description API для CRUD-операций с сотрудниками: получение списка,
 * поиск по фамилии/должности, создание, обновление и удаление.
 */

const express = require('express');
const router = express.Router();
const Employee = require('../models/employee');
const { requirePermission } = require('../middleware/auth');

/**
 * @route GET /employees
 * @description Получение списка всех сотрудников с фильтрацией
 * @param {string} [req.query.lastName] - Фильтр по фамилии (частичное совпадение)
 * @param {string} [req.query.positionId] - Фильтр по ID должности
 * @param {string} [req.query.search] - Поиск по ФИО (частичное совпадение)
 * @returns {Object[]} Список сотрудников
 */
router.get('/', requirePermission('employees', 'view'), async (req, res) => {
  try {
    let employees = await Employee.findAll(req.user.companyId);
    const { lastName, positionId, search } = req.query;

    if (search) {
      const s = search.toLowerCase();
      employees = employees.filter(e =>
        e.lastName.toLowerCase().includes(s) ||
        e.firstName.toLowerCase().includes(s)
      );
    }
    if (lastName) {
      employees = employees.filter(e => e.lastName.toLowerCase().includes(lastName.toLowerCase()));
    }
    if (positionId) {
      employees = employees.filter(e => e.positionId === positionId);
    }

    res.json(employees);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /employees/:id
 * @description Получение сотрудника по идентификатору
 * @param {string} req.params.id - Идентификатор сотрудника
 * @returns {Object} Данные сотрудника
 * @returns {404} Если сотрудник не найден
 */
router.get('/:id', requirePermission('employees', 'view'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id, req.user.companyId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /employees
 * @description Создание нового сотрудника
 * @param {Object} req.body - Данные сотрудника (lastName, firstName, positionId и т.д.)
 * @returns {Object} Созданный сотрудник (201)
 */
router.post('/', requirePermission('employees', 'edit'), async (req, res) => {
  try {
    const employee = await Employee.create(req.body, req.user.companyId);
    res.status(201).json(employee);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /employees/:id
 * @description Обновление данных сотрудника
 * @param {string} req.params.id - Идентификатор сотрудника
 * @param {Object} req.body - Обновлённые данные сотрудника
 * @returns {Object} Обновлённый сотрудник
 * @returns {404} Если сотрудник не найден
 */
router.put('/:id', requirePermission('employees', 'edit'), async (req, res) => {
  try {
    const employee = await Employee.update(req.params.id, req.body, req.user.companyId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route DELETE /employees/:id
 * @description Удаление сотрудника
 * @param {string} req.params.id - Идентификатор сотрудника
 * @returns {Object} Сообщение об успешном удалении
 * @returns {404} Если сотрудник не найден
 */
router.delete('/:id', requirePermission('employees', 'edit'), async (req, res) => {
  try {
    const deleted = await Employee.remove(req.params.id, req.user.companyId);
    if (!deleted) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
