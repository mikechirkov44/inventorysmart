/**
 * @module WorkModel
 * @description Модель для управления типами работ (works).
 * Хранит информацию о видах работ: название, описание,
 * периодичность (в днях) и категория.
 */

const { query } = require('../db');

/**
 * Преобразует строку из БД в объект работы.
 * @param {Object|null} row - Строка из таблицы works
 * @returns {Object|null} Объект работы или null
 */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    frequencyDays: row.frequency_days,
    category: row.category,
    priority: row.priority || 'B',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  /**
   * Получает все виды работ, отсортированные по названию.
   * @async
   * @returns {Promise<Array<Object>>} Список работ
   */
  findAll: async (companyId) => {
    const { rows } = await query('SELECT * FROM works WHERE company_id = $1 ORDER BY name', [companyId]);
    return rows.map(mapRow);
  },

  /**
   * Находит работу по ID.
   * @async
   * @param {number} id - Идентификатор работы
   * @returns {Promise<Object|null>} Объект работы или null
   */
  findById: async (id, companyId) => {
    const { rows } = await query('SELECT * FROM works WHERE id = $1 AND company_id = $2', [id, companyId]);
    return mapRow(rows[0]);
  },

  /**
   * Создаёт новый вид работы.
   * @async
   * @param {Object} data - Данные работы
   * @param {string} [data.name] - Название
   * @param {string} [data.description] - Описание
   * @param {number} [data.frequencyDays] - Периодичность в днях (по умолчанию 30)
   * @param {string} [data.category] - Категория
   * @returns {Promise<Object>} Созданная работа
   */
  create: async (data, companyId) => {
    const { rows } = await query(
      'INSERT INTO works (name, description, frequency_days, category, priority, company_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.name || '', data.description || '', parseInt(data.frequencyDays) || 30, data.category || '', data.priority || 'B', companyId]
    );
    return mapRow(rows[0]);
  },

  /**
   * Обновляет работу по ID.
   * @async
   * @param {number} id - Идентификатор работы
   * @param {Object} data - Данные для обновления
   * @returns {Promise<Object|null>} Обновлённая работа или null
   */
  update: async (id, data, companyId) => {
    const fieldMap = { frequencyDays: 'frequency_days' };
    const fields = [];
    const values = [];
    let i = 1;
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${col} = $${i}`);
      values.push(val);
      i++;
    }
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(companyId);
    const { rows } = await query(`UPDATE works SET ${fields.join(', ')} WHERE id = $${i} AND company_id = $${i + 1} RETURNING *`, values);
    return mapRow(rows[0]);
  },

  /**
   * Удаляет работу по ID.
   * @async
   * @param {number} id - Идентификатор работы
   * @returns {Promise<boolean>} true если удалена, иначе false
   */
  remove: async (id, companyId) => {
    const { rowCount } = await query('DELETE FROM works WHERE id = $1 AND company_id = $2', [id, companyId]);
    return rowCount > 0;
  },

  /**
   * Создаёт несколько видов работ за раз.
   * @async
   * @param {Array<Object>} items - Массив данных работ (см. create)
   * @returns {Promise<Array<Object>>} Список созданных работ
   */
  createMany: async (items, companyId) => {
    const results = [];
    for (const item of items) { results.push(await module.exports.create(item, companyId)); }
    return results;
  }
};
