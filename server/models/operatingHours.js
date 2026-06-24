/**
 * @module OperatingHoursModel
 * @description Модель для управления наработкой оборудования (моточасы, километраж и т.д.)
 * и периодами технического обслуживания.
 */

const { query } = require('../db');

/**
 * Преобразует строку из БД в объект наработки
 * @param {Object|null} row - Строка из таблицы equipment_operating_hours
 * @param {Array} [workIds] - Массив ID работ
 * @returns {Object|null} Объект наработки или null
 */
function mapOperatingHoursRow(row, workIds = []) {
  if (!row) return null;
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    companyId: row.company_id,
    unit: row.unit,
    currentValue: parseFloat(row.current_value) || 0,
    inputDate: row.input_date,
    assignedTo: row.assigned_to,
    autoCreateTasks: row.auto_create_tasks,
    preventDecrease: row.prevent_decrease,
    workIds: workIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Преобразует строку из БД в объект интервала ТО
 * @param {Object|null} row - Строка из таблицы equipment_maintenance_intervals
 * @returns {Object|null} Объект интервала или null
 */
function mapIntervalRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    operatingHoursId: row.operating_hours_id,
    intervalValue: parseFloat(row.interval_value) || 0,
    lastMaintenanceValue: parseFloat(row.last_maintenance_value) || 0,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  /**
   * Получает наработку по ID оборудования
   * @async
   * @param {string} equipmentId - ID оборудования
   * @returns {Promise<Object|null>} Наработка или null
   */
  getByEquipmentId: async (equipmentId) => {
    const { rows } = await query(
      'SELECT * FROM equipment_operating_hours WHERE equipment_id = $1',
      [equipmentId]
    );
    if (rows.length === 0) return null;
    return mapOperatingHoursRow(rows[0]);
  },

  /**
   * Получает наработку с интервалами ТО и работами
   * @async
   * @param {string} equipmentId - ID оборудования
   * @returns {Promise<Object|null>} Наработка с интервалами и работами или null
   */
  getWithIntervals: async (equipmentId) => {
    const { rows } = await query(
      'SELECT * FROM equipment_operating_hours WHERE equipment_id = $1',
      [equipmentId]
    );
    if (rows.length === 0) return null;
    
    const ohId = rows[0].id;
    
    // Get workIds
    const { rows: workRows } = await query(
      'SELECT work_id FROM equipment_operating_hours_works WHERE operating_hours_id = $1',
      [ohId]
    );
    const workIds = workRows.map(r => r.work_id);
    
    const operatingHours = mapOperatingHoursRow(rows[0], workIds);
    
    // Get intervals
    const { rows: intervalRows } = await query(
      'SELECT * FROM equipment_maintenance_intervals WHERE operating_hours_id = $1 ORDER BY interval_value',
      [ohId]
    );
    
    operatingHours.intervals = intervalRows.map(mapIntervalRow);
    return operatingHours;
  },

  /**
   * Создает или обновляет наработку для оборудования
   * @async
   * @param {Object} data - Данные наработки
   * @param {string} data.equipmentId - ID оборудования
   * @param {string} data.companyId - ID компании
   * @param {string} [data.unit] - Единица измерения
   * @param {number} [data.currentValue] - Текущее значение
   * @param {string} [data.inputDate] - Дата ввода
   * @param {string} [data.assignedTo] - ID сотрудника
   * @param {Array} [data.workIds] - Массив ID работ
   * @param {boolean} [data.autoCreateTasks] - Автосоздание задач
   * @param {boolean} [data.preventDecrease] - Запрет уменьшения
   * @returns {Promise<Object>} Созданная/обновленная наработка
   */
  upsert: async (data) => {
    const existing = await module.exports.getByEquipmentId(data.equipmentId);
    
    let result;
    
    if (existing) {
      // Check prevent_decrease
      if (existing.preventDecrease && data.currentValue !== undefined) {
        if (parseFloat(data.currentValue) < parseFloat(existing.currentValue)) {
          throw new Error('Уменьшение наработки запрещено');
        }
      }
      
      // Update
      const { rows } = await query(
        `UPDATE equipment_operating_hours 
         SET unit = COALESCE($1, unit),
             current_value = COALESCE($2, current_value),
             input_date = COALESCE($3, input_date),
             assigned_to = COALESCE($4, assigned_to),
             auto_create_tasks = COALESCE($5, auto_create_tasks),
             prevent_decrease = COALESCE($6, prevent_decrease),
             updated_at = NOW()
         WHERE equipment_id = $7
         RETURNING *`,
        [
          data.unit,
          data.currentValue,
          data.inputDate,
          data.assignedTo,
          data.autoCreateTasks,
          data.preventDecrease,
          data.equipmentId
        ]
      );
      result = rows[0];
      
      // Update work associations if provided
      if (data.workIds !== undefined) {
        // Delete existing associations
        await query(
          'DELETE FROM equipment_operating_hours_works WHERE operating_hours_id = $1',
          [result.id]
        );
        // Insert new associations
        if (Array.isArray(data.workIds) && data.workIds.length > 0) {
          for (const workId of data.workIds) {
            await query(
              'INSERT INTO equipment_operating_hours_works (operating_hours_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [result.id, workId]
            );
          }
        }
      }
      
      // Get updated workIds
      const { rows: workRows } = await query(
        'SELECT work_id FROM equipment_operating_hours_works WHERE operating_hours_id = $1',
        [result.id]
      );
      const workIds = workRows.map(r => r.work_id);
      
      return mapOperatingHoursRow(result, workIds);
    } else {
      // Insert
      const { rows } = await query(
        `INSERT INTO equipment_operating_hours 
         (equipment_id, company_id, unit, current_value, input_date, assigned_to, auto_create_tasks, prevent_decrease)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          data.equipmentId,
          data.companyId,
          data.unit || 'Моточасы (м/ч)',
          data.currentValue || 0,
          data.inputDate,
          data.assignedTo,
          data.autoCreateTasks !== false,
          data.preventDecrease !== false
        ]
      );
      result = rows[0];
      
      // Insert work associations if provided
      if (Array.isArray(data.workIds) && data.workIds.length > 0) {
        for (const workId of data.workIds) {
          await query(
            'INSERT INTO equipment_operating_hours_works (operating_hours_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [result.id, workId]
          );
        }
      }
      
      return mapOperatingHoursRow(result, data.workIds || []);
    }
  },

  /**
   * Удаляет наработку для оборудования
   * @async
   * @param {string} equipmentId - ID оборудования
   * @returns {Promise<boolean>} Результат удаления
   */
  delete: async (equipmentId) => {
    const { rowCount } = await query(
      'DELETE FROM equipment_operating_hours WHERE equipment_id = $1',
      [equipmentId]
    );
    return rowCount > 0;
  },

  /**
   * Добавляет интервал ТО
   * @async
   * @param {Object} data - Данные интервала
   * @param {string} data.operatingHoursId - ID наработки
   * @param {number} data.intervalValue - Значение интервала
   * @param {number} [data.lastMaintenanceValue] - Значение последнего ТО
   * @param {string} [data.description] - Описание
   * @returns {Promise<Object>} Созданный интервал
   */
  addInterval: async (data) => {
    const { rows } = await query(
      `INSERT INTO equipment_maintenance_intervals 
       (operating_hours_id, interval_value, last_maintenance_value, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.operatingHoursId,
        data.intervalValue,
        data.lastMaintenanceValue || 0,
        data.description || ''
      ]
    );
    return mapIntervalRow(rows[0]);
  },

  /**
   * Обновляет интервал ТО
   * @async
   * @param {string} intervalId - ID интервала
   * @param {Object} data - Данные для обновления
   * @returns {Promise<Object>} Обновленный интервал
   */
  updateInterval: async (intervalId, data) => {
    const { rows } = await query(
      `UPDATE equipment_maintenance_intervals 
       SET interval_value = COALESCE($1, interval_value),
           last_maintenance_value = COALESCE($2, last_maintenance_value),
           description = COALESCE($3, description),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [data.intervalValue, data.lastMaintenanceValue, data.description, intervalId]
    );
    return mapIntervalRow(rows[0]);
  },

  /**
   * Удаляет интервал ТО
   * @async
   * @param {string} intervalId - ID интервала
   * @returns {Promise<boolean>} Результат удаления
   */
  deleteInterval: async (intervalId) => {
    const { rowCount } = await query(
      'DELETE FROM equipment_maintenance_intervals WHERE id = $1',
      [intervalId]
    );
    return rowCount > 0;
  },

  /**
   * Получает все оборудование с наработкой для компании
   * @async
   * @param {string} companyId - ID компании
   * @returns {Promise<Array>} Список наработок
   */
  getAllByCompany: async (companyId) => {
    const { rows } = await query(
      'SELECT * FROM equipment_operating_hours WHERE company_id = $1',
      [companyId]
    );
    return rows.map(mapOperatingHoursRow);
  },

  /**
   * Получает оборудование, требующее ТО (приближается к интервалу)
   * @async
   * @param {string} companyId - ID компании
   * @param {number} threshold - Порог в процентах (например, 0.9 для 90%)
   * @returns {Promise<Array>} Список оборудования для ТО
   */
  getEquipmentNeedingMaintenance: async (companyId, threshold = 0.9) => {
    const { rows } = await query(
      `SELECT eoh.*, emi.id as interval_id, emi.interval_value, emi.last_maintenance_value,
              e.name as equipment_name, e.inventory_number
       FROM equipment_operating_hours eoh
       JOIN equipment_maintenance_intervals emi ON emi.operating_hours_id = eoh.id
       JOIN equipment e ON e.id = eoh.equipment_id
       WHERE eoh.company_id = $1
         AND eoh.auto_create_tasks = true
         AND (eoh.current_value - emi.last_maintenance_value) >= (emi.interval_value * $2)`,
      [companyId, threshold]
    );
    return rows;
  }
};
