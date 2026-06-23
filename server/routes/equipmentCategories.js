/**
 * @module Маршруты категорий оборудования
 * @description API для управления категориями оборудования
 */

const express = require('express');
const router = express.Router();
const EquipmentCategory = require('../models/equipmentCategory');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route GET /equipment-categories
 * @description Получение всех категорий оборудования
 */
router.get('/', async (req, res) => {
  try {
    const categories = await EquipmentCategory.findAll(req.user.companyId);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching equipment categories:', error);
    res.status(500).json({ error: 'Ошибка загрузки категорий' });
  }
});

/**
 * @route GET /equipment-categories/:id
 * @description Получение категории по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const category = await EquipmentCategory.findById(req.params.id, req.user.companyId);
    if (!category) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }
    res.json(category);
  } catch (error) {
    console.error('Error fetching equipment category:', error);
    res.status(500).json({ error: 'Ошибка загрузки категории' });
  }
});

/**
 * @route POST /equipment-categories
 * @description Создание новой категории
 */
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Название категории обязательно' });
    }
    const category = await EquipmentCategory.create({ name, description }, req.user.companyId);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating equipment category:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Категория с таким названием уже существует' });
    }
    res.status(500).json({ error: 'Ошибка создания категории' });
  }
});

/**
 * @route PUT /equipment-categories/:id
 * @description Обновление категории
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Название категории обязательно' });
    }
    const category = await EquipmentCategory.update(req.params.id, { name, description }, req.user.companyId);
    if (!category) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }
    res.json(category);
  } catch (error) {
    console.error('Error updating equipment category:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Категория с таким названием уже существует' });
    }
    res.status(500).json({ error: 'Ошибка обновления категории' });
  }
});

/**
 * @route DELETE /equipment-categories/:id
 * @description Удаление категории
 */
router.delete('/:id', async (req, res) => {
  try {
    const success = await EquipmentCategory.remove(req.params.id, req.user.companyId);
    if (!success) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }
    res.json({ message: 'Категория удалена' });
  } catch (error) {
    console.error('Error deleting equipment category:', error);
    res.status(500).json({ error: 'Ошибка удаления категории' });
  }
});

module.exports = router;
