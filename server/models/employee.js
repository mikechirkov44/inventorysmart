/**
 * @module EmployeeModel
 * @description Модель для управления сотрудниками (employees).
 * Хранит ФИО, должность, телефон и email сотрудников.
 */

const { query } = require('../db');

/**
 * Преобразует строку из БД в объект сотрудника.
 * @param {Object|null} row - Строка из таблицы employees
 * @returns {Object|null} Объект сотрудника или null
 */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name,
    positionId: row.position_id,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  /**
   * Получает всех сотрудников, отсортированных по фамилии и имени.
   * @async
   * @returns {Promise<Array<Object>>} Список сотрудников
   */
  findAll: async () => {
    const { rows } = await query('SELECT * FROM employees ORDER BY last_name, first_name');
    return rows.map(mapRow);
  },

  /**
   * Находит сотрудника по ID.
   * @async
   * @param {number} id - Идентификатор сотрудника
   * @returns {Promise<Object|null>} Объект сотрудника или null
   */
  findById: async (id) => {
    const { rows } = await query('SELECT * FROM employees WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  /**
   * Создаёт нового сотрудника.
   * @async
   * @param {Object} data - Данные сотрудника
   * @param {string} [data.firstName] - Имя
   * @param {string} [data.lastName] - Фамилия
   * @param {string} [data.middleName] - Отчество
   * @param {number} [data.positionId] - ID должности
   * @param {string} [data.phone] - Телефон
   * @param {string} [data.email] - Email
   * @returns {Promise<Object>} Созданный сотрудник
   */
  create: async (data) => {
    const { rows } = await query(
      'INSERT INTO employees (first_name, last_name, middle_name, position_id, phone, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.firstName || '', data.lastName || '', data.middleName || '', data.positionId || null, data.phone || '', data.email || '']
    );
    return mapRow(rows[0]);
  },

  /**
   * Обновляет данные сотрудника по ID.
   * @async
   * @param {number} id - Идентификатор сотрудника
   * @param {Object} data - Данные для обновления (любые поля таблицы employees)
   * @returns {Promise<Object|null>} Обновлённый сотрудник или null
   */
  update: async (id, data) => {
    const fieldMap = { firstName: 'first_name', lastName: 'last_name', middleName: 'middle_name', positionId: 'position_id' };
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
    fields.push('updated_at = NOW()');
    values.push(id);
    const { rows } = await query(`UPDATE employees SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
    return mapRow(rows[0]);
  },

  /**
   * Удаляет сотрудника по ID.
   * @async
   * @param {number} id - Идентификатор сотрудника
   * @returns {Promise<boolean>} true если удалён, иначе false
   */
  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM employees WHERE id = $1', [id]);
    return rowCount > 0;
  }
};
