const { query } = require('../db');

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
  findAll: async () => {
    const { rows } = await query('SELECT * FROM work_orders ORDER BY created_at DESC');
    return rows.map(mapRow);
  },

  findById: async (id) => {
    const { rows } = await query('SELECT * FROM work_orders WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  findByEquipmentId: async (equipmentId) => {
    const { rows } = await query('SELECT * FROM work_orders WHERE equipment_id = $1 ORDER BY created_at DESC', [equipmentId]);
    return rows.map(mapRow);
  },

  create: async (data) => {
    const status = data.status || 'pending';
    const { rows } = await query(
      'INSERT INTO work_orders (equipment_id, task_id, task_name, status, master_name, notes, photos, spare_parts_used, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        data.equipmentId,
        data.taskId || null,
        data.taskName || '',
        status,
        data.masterName || '',
        data.notes || '',
        JSON.stringify(data.photos || []),
        JSON.stringify(data.sparePartsUsed || []),
        status === 'completed' ? new Date().toISOString() : null
      ]
    );
    return mapRow(rows[0]);
  },

  update: async (id, data) => {
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
    const { rows } = await query(`UPDATE work_orders SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    return mapRow(rows[0]);
  },

  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM work_orders WHERE id = $1', [id]);
    return rowCount > 0;
  },

  createMany: async (items) => {
    const results = [];
    for (const item of items) { results.push(await module.exports.create(item)); }
    return results;
  }
};
