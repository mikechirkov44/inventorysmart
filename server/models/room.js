/**
 * @module RoomModel
 * @description Модель для управления помещениями (rooms).
 * Хранит информацию о комнатах/помещениях: название, описание,
 * здание, этаж и ответственный сотрудник.
 */

const { query } = require('../db');

/**
 * Преобразует строку из БД в объект помещения.
 * @param {Object|null} row - Строка из таблицы rooms
 * @returns {Object|null} Объект помещения или null
 */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    building: row.building,
    floor: row.floor,
    responsibleEmployeeId: row.responsible_employee_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  /**
   * Получает все помещения, отсортированные по названию.
   * @async
   * @returns {Promise<Array<Object>>} Список помещений
   */
  findAll: async () => {
    const { rows } = await query('SELECT * FROM rooms ORDER BY name');
    return rows.map(mapRow);
  },

  /**
   * Находит помещение по ID.
   * @async
   * @param {number} id - Идентификатор помещения
   * @returns {Promise<Object|null>} Объект помещения или null
   */
  findById: async (id) => {
    const { rows } = await query('SELECT * FROM rooms WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  /**
   * Создаёт новое помещение.
   * @async
   * @param {Object} data - Данные помещения
   * @param {string} [data.name] - Название
   * @param {string} [data.description] - Описание
   * @param {string} [data.building] - Здание
   * @param {string} [data.floor] - Этаж
   * @param {number} [data.responsibleEmployeeId] - ID ответственного сотрудника
   * @returns {Promise<Object>} Созданное помещение
   */
  create: async (data) => {
    const { rows } = await query(
      'INSERT INTO rooms (name, description, building, floor, responsible_employee_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [data.name || '', data.description || '', data.building || '', data.floor || '', data.responsibleEmployeeId || null]
    );
    return mapRow(rows[0]);
  },

  /**
   * Обновляет помещение по ID.
   * @async
   * @param {number} id - Идентификатор помещения
   * @param {Object} data - Данные для обновления
   * @returns {Promise<Object|null>} Обновлённое помещение или null
   */
  update: async (id, data) => {
    const fieldMap = { responsibleEmployeeId: 'responsible_employee_id' };
    const mapped = {};
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      mapped[col] = val;
    }
    mapped.updated_at = new Date();
    const keys = Object.keys(mapped);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const vals = keys.map(k => mapped[k]);
    vals.push(id);
    const { rows } = await query(`UPDATE rooms SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    return mapRow(rows[0]);
  },

  /**
   * Удаляет помещение по ID.
   * @async
   * @param {number} id - Идентификатор помещения
   * @returns {Promise<boolean>} true если удалено, иначе false
   */
  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM rooms WHERE id = $1', [id]);
    return rowCount > 0;
  },

  /**
   * Создаёт несколько помещений за раз.
   * @async
   * @param {Array<Object>} items - Массив данных помещений (см. create)
   * @returns {Promise<Array<Object>>} Список созданных помещений
   */
  createMany: async (items) => {
    const results = [];
    for (const item of items) { results.push(await module.exports.create(item)); }
    return results;
  }
};
