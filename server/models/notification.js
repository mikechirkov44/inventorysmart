/**
 * @module NotificationModel
 * @description Модель для управления уведомлениями (notifications).
 * Хранит уведомления пользователей о событиях системы:
 * типа уведомления, заголовке, сообщении, привязке к оборудованию/работе/инциденту.
 */

const { query } = require('../db');

function serializeTimestamp(value) {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Преобразует строку из БД в объект уведомления.
 * @param {Object|null} row - Строка из таблицы notifications
 * @returns {Object|null} Объект уведомления или null
 */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    equipmentId: row.equipment_id,
    workId: row.work_id,
    incidentId: row.incident_id,
    read: row.read,
    readAt: serializeTimestamp(row.read_at),
    createdAt: serializeTimestamp(row.created_at ?? row.createdAt),
  };
}

module.exports = {
  /**
   * Получает все уведомления, отсортированные по дате создания (новые первые).
   * @async
   * @returns {Promise<Array<Object>>} Список уведомлений
   */
  findAll: async () => {
    const { rows } = await query('SELECT * FROM notifications ORDER BY created_at DESC');
    return rows.map(mapRow);
  },

  /**
   * Находит уведомление по ID.
   * @async
   * @param {number} id - Идентификатор уведомления
   * @returns {Promise<Object|null>} Объект уведомления или null
   */
  findById: async (id) => {
    const { rows } = await query('SELECT * FROM notifications WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  /**
   * Получает уведомления конкретного пользователя.
   * @async
   * @param {number} userId - ID пользователя
   * @returns {Promise<Array<Object>>} Список уведомлений пользователя
   */
  findByUser: async (userId) => {
    const { rows } = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return rows.map(mapRow);
  },

  /**
   * Получает непрочитанные уведомления пользователя.
   * @async
   * @param {number} userId - ID пользователя
   * @returns {Promise<Array<Object>>} Список непрочитанных уведомлений
   */
  findUnread: async (userId) => {
    const { rows } = await query('SELECT * FROM notifications WHERE user_id = $1 AND read = false ORDER BY created_at DESC', [userId]);
    return rows.map(mapRow);
  },

  /**
   * Создаёт уведомление или обновляет существующее за сегодня по той же задаче.
   * @async
   * @param {Object} data - Данные уведомления
   * @returns {Promise<Object>} Уведомление (новое или обновлённое)
   */
  create: async (data) => {
    const params = [
      data.userId,
      data.type || 'info',
      data.equipmentId || null,
      data.workId || null,
    ];

    const { rows: existingRows } = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1 AND type = $2
         AND equipment_id IS NOT DISTINCT FROM $3
         AND work_id IS NOT DISTINCT FROM $4
         AND (
           read = false
           OR created_at >= CURRENT_DATE
         )
       ORDER BY created_at DESC
       LIMIT 1`,
      params,
    );

    if (existingRows[0]) {
      const { rows } = await query(
        `UPDATE notifications
         SET title = $1, message = $2
         WHERE id = $3
         RETURNING *`,
        [data.title || '', data.message || '', existingRows[0].id],
      );
      return mapRow(rows[0]);
    }

    const { rows } = await query(
      'INSERT INTO notifications (user_id, type, title, message, equipment_id, work_id, incident_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        data.userId,
        data.type || 'info',
        data.title || '',
        data.message || '',
        data.equipmentId || null,
        data.workId || null,
        data.incidentId || null,
      ],
    );
    return mapRow(rows[0]);
  },

  /**
   * Помечает уведомление как прочитанное.
   * @async
   * @param {number} id - Идентификатор уведомления
   * @returns {Promise<Object|null>} Обновлённое уведомление или null
   */
  markRead: async (id) => {
    const { rows } = await query('UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1 RETURNING *', [id]);
    return mapRow(rows[0]);
  },

  /**
   * Помечает все непрочитанные уведомления пользователя как прочитанные.
   * @async
   * @param {number} userId - ID пользователя
   */
  /**
   * Отменяет прочтение уведомления (помечает как непрочитанное).
   * @async
   * @param {number} id - Идентификатор уведомления
   * @returns {Promise<Object|null>} Обновлённое уведомление или null
   */
  markUnread: async (id) => {
    const { rows } = await query('UPDATE notifications SET read = false, read_at = null WHERE id = $1 RETURNING *', [id]);
    return mapRow(rows[0]);
  },

  markAllRead: async (userId) => {
    await query('UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false', [userId]);
  },

  /**
   * Удаляет уведомление по ID.
   * @async
   * @param {number} id - Идентификатор уведомления
   * @returns {Promise<boolean>} true если удалено, иначе false
   */
  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM notifications WHERE id = $1', [id]);
    return rowCount > 0;
  }
};
