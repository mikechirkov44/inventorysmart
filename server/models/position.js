/**
 * @module PositionModel
 * @description Модель для управления должностями (positions).
 * Хранит название должности и набор разрешений (permissions) в формате JSON.
 */

const { query } = require('../db');

/**
 * Преобразует строку из БД в объект должности.
 * @param {Object|null} row - Строка из таблицы positions
 * @returns {Object|null} Объект должности или null
 */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  /**
   * Получает все должности, отсортированные по названию.
   * @async
   * @returns {Promise<Array<Object>>} Список должностей
   */
  findAll: async () => {
    const { rows } = await query('SELECT * FROM positions ORDER BY name');
    return rows.map(mapRow);
  },

  /**
   * Находит должность по ID.
   * @async
   * @param {number} id - Идентификатор должности
   * @returns {Promise<Object|null>} Объект должности или null
   */
  findById: async (id) => {
    const { rows } = await query('SELECT * FROM positions WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  /**
   * Находит должность по названию.
   * @async
   * @param {string} name - Название должности
   * @returns {Promise<Object|null>} Объект должности или null
   */
  findByName: async (name) => {
    const { rows } = await query('SELECT * FROM positions WHERE name = $1', [name]);
    return mapRow(rows[0]);
  },

  /**
   * Создаёт новую должность.
   * @async
   * @param {Object} data - Данные должности
   * @param {string} data.name - Название должности
   * @param {Object} [data.permissions] - Объект разрешений (JSON)
   * @returns {Promise<Object>} Созданная должность
   */
  create: async (data) => {
    const { rows } = await query(
      'INSERT INTO positions (name, permissions) VALUES ($1, $2) RETURNING *',
      [data.name, JSON.stringify(data.permissions || {})]
    );
    return mapRow(rows[0]);
  },

  /**
   * Обновляет должность по ID.
   * @async
   * @param {number} id - Идентификатор должности
   * @param {Object} data - Данные для обновления (name, permissions)
   * @returns {Promise<Object|null>} Обновлённая должность или null
   */
  update: async (id, data) => {
    const fields = [];
    const values = [];
    let i = 1;
    if (data.name !== undefined) { fields.push(`name = $${i}`); values.push(data.name); i++; }
    if (data.permissions !== undefined) { fields.push(`permissions = $${i}`); values.push(JSON.stringify(data.permissions)); i++; }
    if (fields.length === 0) return null;
    fields.push('updated_at = NOW()');
    values.push(id);
    const { rows } = await query(`UPDATE positions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
    return mapRow(rows[0]);
  },

  /**
   * Удаляет должность по ID.
   * @async
   * @param {number} id - Идентификатор должности
   * @returns {Promise<boolean>} true если удалена, иначе false
   */
  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM positions WHERE id = $1', [id]);
    return rowCount > 0;
  }
};
