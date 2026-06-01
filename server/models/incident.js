const { query } = require('../db');
const fs = require('fs');
const path = require('path');

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
  findAll: async () => {
    const { rows } = await query('SELECT * FROM incidents ORDER BY created_at DESC');
    return rows.map(mapRow);
  },

  findById: async (id) => {
    const { rows } = await query('SELECT * FROM incidents WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  findByEquipmentId: async (equipmentId) => {
    const { rows } = await query('SELECT * FROM incidents WHERE equipment_id = $1 ORDER BY created_at DESC', [equipmentId]);
    return rows.map(mapRow);
  },

  create: async (data) => {
    const { rows } = await query(
      'INSERT INTO incidents (equipment_id, employee_id, employee_name, description, photos, status, admin_notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [data.equipmentId, data.employeeId || null, data.employeeName || '', data.description || '', JSON.stringify(data.photos || []), 'new', '']
    );
    return mapRow(rows[0]);
  },

  update: async (id, data) => {
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
    const { rows } = await query(`UPDATE incidents SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    return mapRow(rows[0]);
  },

  remove: async (id) => {
    const incident = await module.exports.findById(id);
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
    const { rowCount } = await query('DELETE FROM incidents WHERE id = $1', [id]);
    return rowCount > 0;
  }
};
