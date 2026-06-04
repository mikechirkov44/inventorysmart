/**
 * @module WorkOrderModel
 * @description Модель для управления нарядами-заказами (work_orders).
 * Хранит информацию о выполнении работ: оборудование, задача,
 * статус, мастер, заметки, фото и использованные запчасти.
 */

const { query } = require('../db');

/**
 * Преобразует строку из БД в объект наряда-заказа.
 * @param {Object|null} row - Строка из таблицы work_orders
 * @returns {Object|null} Объект наряда-заказа или null
 */
function mapRow(row) {
  if (!row) return null;
  let photos = row.photos;
  if (typeof photos === 'string') { try { photos = JSON.parse(photos); } catch (_) { photos = []; } }
  let sparePartsUsed = row.spare_parts_used;
  if (typeof sparePartsUsed === 'string') { try { sparePartsUsed = JSON.parse(sparePartsUsed); } catch (_) { sparePartsUsed = []; } }
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    taskId: row.task_id,
    taskName: row.task_name,
    status: row.status,
    masterName: row.master_name,
    notes: row.notes,
    photos,
    sparePartsUsed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  /**
   * Получает все наряды-заказы, отсортированные по дате создания (новые первые).
   * @async
   * @returns {Promise<Array<Object>>} Список нарядов-заказов
   */
  findAll: async (companyId) => {
    const { rows } = await query('SELECT * FROM work_orders WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    return rows.map(mapRow);
  },

  /**
   * Находит наряд-заказ по ID.
   * @async
   * @param {number} id - Идентификатор наряда-заказа
   * @returns {Promise<Object|null>} Объект наряда-заказа или null
   */
  findById: async (id, companyId) => {
    const { rows } = await query('SELECT * FROM work_orders WHERE id = $1 AND company_id = $2', [id, companyId]);
    return mapRow(rows[0]);
  },

  /**
   * Находит все наряды-заказы для указанного оборудования.
   * @async
   * @param {number} equipmentId - ID оборудования
   * @returns {Promise<Array<Object>>} Список нарядов-заказов
   */
  findByEquipmentId: async (equipmentId, companyId) => {
    const { rows } = await query('SELECT * FROM work_orders WHERE equipment_id = $1 AND company_id = $2 ORDER BY created_at DESC', [equipmentId, companyId]);
    return rows.map(mapRow);
  },

  /**
   * Создаёт новый наряд-заказ.
   * @async
   * @param {Object} data - Данные наряда-заказа
   * @param {number} data.equipmentId - ID оборудования
   * @param {number} [data.taskId] - ID задачи (работы)
   * @param {string} [data.taskName] - Название задачи
   * @param {string} [data.status] - Статус (pending/in_progress/completed)
   * @param {string} [data.masterName] - Имя мастера
   * @param {string} [data.notes] - Заметки
   * @param {Array<string>} [data.photos] - Массив путей к фотографиям
   * @param {Array<Object>} [data.sparePartsUsed] - Использованные запчасти
   * @returns {Promise<Object>} Созданный наряд-заказ
   */
  create: async (data, companyId) => {
    const status = data.status || 'pending';
    const { rows } = await query(
      'INSERT INTO work_orders (equipment_id, task_id, task_name, status, master_name, notes, photos, spare_parts_used, completed_at, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [
        data.equipmentId,
        data.taskId || null,
        data.taskName || '',
        status,
        data.masterName || '',
        data.notes || '',
        JSON.stringify(data.photos || []),
        JSON.stringify(data.sparePartsUsed || []),
        status === 'completed' ? new Date().toISOString() : null,
        companyId
      ]
    );
    return mapRow(rows[0]);
  },

  /**
   * Обновляет наряд-заказ по ID. При статусе 'completed' автоматически
   * устанавливает completedAt.
   * @async
   * @param {number} id - Идентификатор наряда-заказа
   * @param {Object} data - Данные для обновления
   * @returns {Promise<Object|null>} Обновлённый наряд-заказ или null
   */
  update: async (id, data, companyId) => {
    const fieldMap = {
      equipmentId: 'equipment_id', taskId: 'task_id', taskName: 'task_name',
      masterName: 'master_name', sparePartsUsed: 'spare_parts_used', completedAt: 'completed_at'
    };
    const mapped = {};

    for (const [key, val] of Object.entries(data)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (col === 'spare_parts_used' && typeof val === 'string') {
        try { mapped[col] = JSON.stringify(JSON.parse(val)); } catch (_) { mapped[col] = '[]'; }
      } else if (col === 'spare_parts_used' && Array.isArray(val)) {
        mapped[col] = JSON.stringify(val);
      } else if (col === 'photos' && Array.isArray(val)) {
        mapped[col] = JSON.stringify(val);
      } else {
        mapped[col] = val;
      }
    }

    if (mapped.status === 'completed' && !mapped.completed_at) {
      mapped.completed_at = new Date().toISOString();
    }
    mapped.updated_at = new Date();

    const keys = Object.keys(mapped);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const vals = keys.map(k => mapped[k]);
    vals.push(id);
    vals.push(companyId);
    const { rows } = await query(`UPDATE work_orders SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND company_id = $${vals.length} RETURNING *`, vals);
    return mapRow(rows[0]);
  },

  /**
   * Удаляет наряд-заказ по ID.
   * @async
   * @param {number} id - Идентификатор наряда-заказа
   * @returns {Promise<boolean>} true если удалён, иначе false
   */
  remove: async (id, companyId) => {
    const { rowCount } = await query('DELETE FROM work_orders WHERE id = $1 AND company_id = $2', [id, companyId]);
    return rowCount > 0;
  },

  /**
   * Создаёт несколько нарядов-заказов за раз.
   * @async
   * @param {Array<Object>} items - Массив данных нарядов-заказов (см. create)
   * @returns {Promise<Array<Object>>} Список созданных нарядов-заказов
   */
  createMany: async (items, companyId) => {
    const results = [];
    for (const item of items) { results.push(await module.exports.create(item, companyId)); }
    return results;
  }
};
