/**
 * @module publicApi
 * @description Публичные API endpoints для интеграции с внешними сервисами.
 * Требуется API ключ в заголовке X-API-Key.
 */

const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('../middleware/apiAuth');
const equipmentModel = require('../models/equipment');

// Apply API key authentication to all routes
router.use(authenticateApiKey);

/**
 * @route GET /api/public/equipment
 * @description Получить список всего оборудования компании
 * @query {string} [status] - Фильтр по статусу (working, under_repair, needs_repair)
 * @query {string} [category] - Фильтр по категории
 * @query {string} [room] - Фильтр по помещению (ID)
 * @query {string} [search] - Поиск по названию или инвентарному номеру
 * @returns {Array} Список оборудования
 */
router.get('/equipment', async (req, res) => {
  try {
    const { companyId } = req.apiCompany;
    const { status, category, room, search } = req.query;

    // Get all equipment for the company
    const equipment = await equipmentModel.findAll(companyId);

    // Apply filters
    let filtered = equipment;

    if (status) {
      filtered = filtered.filter(e => e.status === status);
    }

    if (category) {
      filtered = filtered.filter(e => e.categoryId === category || e.categoryName === category);
    }

    if (room) {
      filtered = filtered.filter(e => e.roomId === room);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(e =>
        (e.name && e.name.toLowerCase().includes(searchLower)) ||
        (e.inventoryNumber && e.inventoryNumber.toLowerCase().includes(searchLower))
      );
    }

    // Format response
    const formatted = filtered.map(item => ({
      id: item.id,
      name: item.name,
      inventoryNumber: item.inventoryNumber,
      status: item.status,
      statusLabel: getStatusLabel(item.status),
      category: item.categoryName,
      room: item.roomName,
      manufacturer: item.manufacturer,
      serialNumber: item.serialNumber,
      yearOfManufacture: item.yearOfManufacture,
      qrCode: item.qrCode,
      photo: item.photo,
      updatedAt: item.updatedAt
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    console.error('Error fetching equipment via API:', err);
    res.status(500).json({ error: 'Failed to fetch equipment.' });
  }
});

/**
 * @route GET /api/public/equipment/:id
 * @description Получить детальную информацию об оборудовании по ID
 * @param {string} id - ID оборудования
 * @returns {Object} Детали оборудования
 */
router.get('/equipment/:id', async (req, res) => {
  try {
    const { companyId } = req.apiCompany;
    const { id } = req.params;

    const item = await equipmentModel.getById(id, companyId);

    if (!item) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    res.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        inventoryNumber: item.inventoryNumber,
        description: item.description,
        status: item.status,
        statusLabel: getStatusLabel(item.status),
        category: item.categoryName,
        room: item.roomName,
        manufacturer: item.manufacturer,
        serialNumber: item.serialNumber,
        yearOfManufacture: item.yearOfManufacture,
        qrCode: item.qrCode,
        photo: item.photo,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }
    });
  } catch (err) {
    console.error('Error fetching equipment details via API:', err);
    res.status(500).json({ error: 'Failed to fetch equipment details.' });
  }
});

/**
 * @route GET /api/public/stats
 * @description Получить статистику по оборудованию компании
 * @returns {Object} Статистика
 */
router.get('/stats', async (req, res) => {
  try {
    const { companyId } = req.apiCompany;

    const equipment = await equipmentModel.findAll(companyId);

    const stats = {
      total: equipment.length,
      byStatus: {
        working: equipment.filter(e => e.status === 'working').length,
        underRepair: equipment.filter(e => e.status === 'under_repair').length,
        needsRepair: equipment.filter(e => e.status === 'needs_repair').length
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching stats via API:', err);
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
});

/**
 * Возвращает читаемую метку статуса
 * @param {string} status - Код статуса
 * @returns {string} Читаемая метка
 */
function getStatusLabel(status) {
  const labels = {
    working: 'Работает',
    under_repair: 'В ремонте',
    needs_repair: 'Требует ремонта'
  };
  return labels[status] || status;
}

module.exports = router;
