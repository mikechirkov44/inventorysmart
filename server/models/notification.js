const { query } = require('../db');

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
    readAt: row.read_at,
    createdAt: row.created_at
  };
}

module.exports = {
  findAll: async () => {
    const { rows } = await query('SELECT * FROM notifications ORDER BY created_at DESC');
    return rows.map(mapRow);
  },

  findById: async (id) => {
    const { rows } = await query('SELECT * FROM notifications WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  findByUser: async (userId) => {
    const { rows } = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return rows.map(mapRow);
  },

  findUnread: async (userId) => {
    const { rows } = await query('SELECT * FROM notifications WHERE user_id = $1 AND read = false ORDER BY created_at DESC', [userId]);
    return rows.map(mapRow);
  },

  create: async (data) => {
    const existing = await query(
      'SELECT id FROM notifications WHERE user_id = $1 AND type = $2 AND equipment_id = $3 AND work_id = $4 AND read = false',
      [data.userId, data.type || 'info', data.equipmentId || null, data.workId || null]
    );
    if (existing.rows[0]) return mapRow(existing.rows[0]);

    const { rows } = await query(
      'INSERT INTO notifications (user_id, type, title, message, equipment_id, work_id, incident_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [data.userId, data.type || 'info', data.title || '', data.message || '', data.equipmentId || null, data.workId || null, data.incidentId || null]
    );
    return mapRow(rows[0]);
  },

  markRead: async (id) => {
    const { rows } = await query('UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1 RETURNING *', [id]);
    return mapRow(rows[0]);
  },

  markAllRead: async (userId) => {
    await query('UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false', [userId]);
  },

  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM notifications WHERE id = $1', [id]);
    return rowCount > 0;
  }
};
