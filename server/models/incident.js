/**
 * @module IncidentModel
 * @description Модель для управления инцидентами (incidents).
 * Хранит информацию о происшествиях с оборудованием: описание,
 * фото, статус, заметки администратора и привязку к сотруднику.
 */

const { query } = require('../db');
const fs = require('fs');
const path = require('path');

/**
 * Преобразует строку из БД в объект инцидента.
 * @param {Object|null} row - Строка из таблицы incidents
 * @returns {Object|null} Объект инцидента или null
 */
function mapRow(row) {
  if (!row) return null;
  let photos = row.photos;
  if (typeof photos === 'string') { try { photos = JSON.parse(photos); } catch (_) { photos = []; } }
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    description: row.description,
    photos,
    status: row.status,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  /**
   * Получает все инциденты, отсортированные по дате создания (новые первые).
   * @async
   * @returns {Promise<Array<Object>>} Список инцидентов
   */
  findAll: async (companyId) => {
    const { rows } = await query('SELECT * FROM incidents WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    return rows.map(mapRow);
  },

  /**
   * Находит инцидент по ID.
   * @async
   * @param {number} id - Идентификатор инцидента
   * @returns {Promise<Object|null>} Объект инцидента или null
   */
  findById: async (id, companyId) => {
    const { rows } = await query('SELECT * FROM incidents WHERE id = $1 AND company_id = $2', [id, companyId]);
    return mapRow(rows[0]);
  },

  /**
   * Находит все инциденты для указанного оборудования.
   * @async
   * @param {number} equipmentId - ID оборудования
   * @returns {Promise<Array<Object>>} Список инцидентов оборудования
   */
  findByEquipmentId: async (equipmentId) => {
    const { rows } = await query('SELECT * FROM incidents WHERE equipment_id = $1 ORDER BY created_at DESC', [equipmentId]);
    return rows.map(mapRow);
  },

  /**
   * Создаёт новый инцидент.
   * @async
   * @param {Object} data - Данные инцидента
   * @param {number} data.equipmentId - ID оборудования
   * @param {number} [data.employeeId] - ID сотрудника-заявителя
   * @param {string} [data.employeeName] - Имя сотрудника
   * @param {string} [data.description] - Описание инцидента
   * @param {Array<string>} [data.photos] - Массив путей к фотографиям
   * @returns {Promise<Object>} Созданный инцидент (статус: new)
   */
  create: async (data, companyId) => {
    const { rows } = await query(
      'INSERT INTO incidents (equipment_id, employee_id, employee_name, description, photos, status, admin_notes, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [data.equipmentId, data.employeeId || null, data.employeeName || '', data.description || '', JSON.stringify(data.photos || []), 'new', '', companyId]
    );
    return mapRow(rows[0]);
  },

  /**
   * Обновляет инцидент по ID.
   * @async
   * @param {number} id - Идентификатор инцидента
   * @param {Object} data - Данные для обновления (status, adminNotes, photos и т.д.)
   * @returns {Promise<Object|null>} Обновлённый инцидент или null
   */
  update: async (id, data, companyId) => {
    const fieldMap = { adminNotes: 'admin_notes' };
    const mapped = {};
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (col === 'photos' && Array.isArray(val)) {
        mapped[col] = JSON.stringify(val);
      } else {
        mapped[col] = val;
      }
    }
    mapped.updated_at = new Date();

    const keys = Object.keys(mapped);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const vals = keys.map(k => mapped[k]);
    vals.push(id);
    vals.push(companyId);
    const { rows } = await query(`UPDATE incidents SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND company_id = $${vals.length} RETURNING *`, vals);
    return mapRow(rows[0]);
  },

  /**
   * Удаляет инцидент по ID и удаляет связанные файлы фотографий.
   * @async
   * @param {number} id - Идентификатор инцидента
   * @returns {Promise<boolean>} true если удалён, иначе false
   */
  remove: async (id, companyId) => {
    const incident = await module.exports.findById(id, companyId);
    if (incident && incident.photos) {
      let photos = incident.photos;
      if (typeof photos === 'string') { try { photos = JSON.parse(photos); } catch (_) { photos = []; } }
      if (Array.isArray(photos)) {
        photos.forEach(photo => {
          const photoPath = path.join(__dirname, '..', 'uploads', photo);
          if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
        });
      }
    }
    const { rowCount } = await query('DELETE FROM incidents WHERE id = $1 AND company_id = $2', [id, companyId]);
    return rowCount > 0;
  }
};
