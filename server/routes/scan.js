/**
 * @module Маршруты сканирования
 * @description API для сканирования QR-кодов оборудования: получение полной информации
 * о оборудовании, его помещении, ответственном сотруднике, запланированных и просроченных задачах,
 * а также завершение работ через QR-сканирование.
 */

const express = require('express');
const router = express.Router();
const Equipment = require('../models/equipment');
const WorkOrder = require('../models/workOrder');
const Work = require('../models/work');
const Room = require('../models/room');
const Employee = require('../models/employee');
const SparePart = require('../models/sparePart');

/**
 * @route GET /scan/:code
 * @description Получение полной информации об оборудовании по QR-коду или инвентарному номеру.
 * Включает данные оборудования, помещения, ответственного сотрудника, просроченные и актуальные задачи.
 * @param {string} req.params.code - QR-код (UUID), ID или инвентарный номер оборудования
 * @returns {Object} Полная информация для осмотра
 * @returns {Object} return.equipment - Данные оборудования
 * @returns {Object|null} return.room - Данные помещения
 * @returns {Object|null} return.responsibleEmployee - Ответственный сотрудник
 * @returns {Object[]} return.dueTasks - Просроченные/актуальные задачи
 * @returns {Object[]} return.notDueTasks - Задачи в плане
 * @returns {number} return.completedTotal - Общее количество выполненных работ
 * @returns {404} Если оборудование не найдено
 */
router.get('/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let equipment = null;

    if (uuidRegex.test(code)) {
      equipment = await Equipment.findByQrCode(code);
      if (!equipment) equipment = await Equipment.findById(code, req.user.companyId);
    }
    if (!equipment) equipment = await Equipment.findByInventoryNumber(code);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    if (equipment.company_id !== req.user.companyId) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    let room = null;
    let responsibleEmployee = null;
    if (equipment.roomId) {
      room = await Room.findById(equipment.roomId, req.user.companyId);
      if (room && room.responsibleEmployeeId) {
        responsibleEmployee = await Employee.findById(room.responsibleEmployeeId, req.user.companyId);
      }
    }

    const allWorks = await Work.findAll(req.user.companyId);
    const workMap = {};
    allWorks.forEach(w => { workMap[w.id] = w; });

    const allSpareParts = await SparePart.findAll(req.user.companyId);
    const sparePartsForEquipment = allSpareParts.filter(sp => (sp.equipmentIds || []).includes(equipment.id));

    const workOrders = await WorkOrder.findByEquipmentId(equipment.id, req.user.companyId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let workIds = equipment.workIds || [];
    if (!Array.isArray(workIds)) workIds = [];
    const dueTasks = [];
    const notDueTasks = [];

    workIds.forEach(wid => {
      const work = workMap[wid];
      if (!work) return;

      const completedOrders = workOrders
        .filter(wo => wo.taskId === wid && wo.status === 'completed' && wo.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      const lastCompleted = completedOrders.length > 0 ? new Date(completedOrders[0].completedAt) : null;

      let nextDue = null;
      let isOverdue = false;
      let isDueToday = false;

      if (lastCompleted) {
        nextDue = new Date(lastCompleted);
        nextDue.setDate(nextDue.getDate() + (work.frequencyDays || 30));
        nextDue.setHours(0, 0, 0, 0);

        isOverdue = today >= nextDue;
        isDueToday = today.getTime() === nextDue.getTime() ||
          (today > nextDue && today.getTime() - nextDue.getTime() < 86400000);
      } else {
        isOverdue = true;
        isDueToday = true;
      }

      const workSpareParts = sparePartsForEquipment
        .filter(sp => (sp.workLinks || []).some(wl => wl.workId === wid))
        .map(sp => {
          const wl = sp.workLinks.find(x => x.workId === wid);
          return {
            sparePartId: sp.id,
            name: sp.name,
            article: sp.article,
            unit: sp.unit || 'шт',
            defaultQuantity: wl ? wl.quantity : 0,
            inStock: sp.quantity || 0
          };
        });

      const entry = {
        workId: work.id,
        name: work.name,
        description: work.description,
        frequencyDays: work.frequencyDays,
        category: work.category,
        lastCompleted: lastCompleted ? lastCompleted.toISOString() : null,
        nextDue: nextDue ? nextDue.toISOString() : null,
        isOverdue,
        completedCount: completedOrders.length,
        spareParts: workSpareParts,
      };

      if (isOverdue) {
        dueTasks.push(entry);
      } else {
        notDueTasks.push(entry);
      }
    });

    res.json({
      equipment,
      room,
      responsibleEmployee,
      dueTasks,
      notDueTasks,
      completedTotal: workOrders.filter(wo => wo.status === 'completed').length,
    });
  } catch (error) {
    console.error('Scan error:', error.message);
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /scan/complete
 * @description Завершение работы по оборудованию через QR-сканирование.
 * Создаёт запись о выполнении (WorkOrder) и списывает использованные запчасти со склада.
 * @param {Object} req.body
 * @param {string} req.body.equipmentId - Идентификатор оборудования
 * @param {string} req.body.workId - Идентификатор работы
 * @param {string} req.body.masterName - ФИО мастера
 * @param {string} [req.body.notes] - Примечания к выполнению
 * @param {Array} [req.body.sparePartsUsed] - Использованные запчасти [{sparePartId, quantity}]
 * @returns {Object} Созданная запись WorkOrder и список списанных запчастей
 */
router.post('/complete', async (req, res) => {
  try {
    const { equipmentId, workId, masterName, notes, sparePartsUsed } = req.body;

    const equipment = await Equipment.findById(equipmentId, req.user.companyId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    if (equipment.company_id !== req.user.companyId) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const allWorks = await Work.findAll(req.user.companyId);
    const work = allWorks.find(w => w.id === workId);
    const taskName = work ? work.name : workId;

    const workOrder = await WorkOrder.create({
      equipmentId,
      taskId: workId,
      taskName,
      masterName,
      notes,
      sparePartsUsed: sparePartsUsed || [],
      status: 'completed'
    }, req.user.companyId);

    let sparePartsDeducted = [];
    if (sparePartsUsed && sparePartsUsed.length > 0) {
      sparePartsDeducted = await SparePart.deductStock(sparePartsUsed, req.user.companyId);
    }

    res.status(201).json({ workOrder, sparePartsDeducted });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
