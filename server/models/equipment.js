const { query } = require('../db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    qrCode: row.qr_code,
    name: row.name,
    inventoryNumber: row.inventory_number,
    description: row.description,
    photo: row.photo,
    roomId: row.room_id,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  findAll: async () => {
    const { rows: equipment } = await query('SELECT * FROM equipment ORDER BY name');
    const { rows: eqWorks } = await query('SELECT * FROM equipment_works');
    return equipment.map(eq => ({
      ...mapRow(eq),
      workIds: eqWorks.filter(ew => ew.equipment_id === eq.id).map(ew => ew.work_id)
    }));
  },

  findById: async (id) => {
    const { rows } = await query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (!rows[0]) return null;
    const { rows: eqWorks } = await query('SELECT work_id FROM equipment_works WHERE equipment_id = $1', [id]);
    return { ...mapRow(rows[0]), workIds: eqWorks.map(ew => ew.work_id) };
  },

  findByQrCode: async (qrCode) => {
    const { rows } = await query('SELECT * FROM equipment WHERE qr_code = $1', [qrCode]);
    if (!rows[0]) return null;
    const { rows: eqWorks } = await query('SELECT work_id FROM equipment_works WHERE equipment_id = $1', [rows[0].id]);
    return { ...mapRow(rows[0]), workIds: eqWorks.map(ew => ew.work_id) };
  },

  findByInventoryNumber: async (inventoryNumber) => {
    const { rows } = await query('SELECT * FROM equipment WHERE inventory_number = $1', [inventoryNumber]);
    if (!rows[0]) return null;
    const { rows: eqWorks } = await query('SELECT work_id FROM equipment_works WHERE equipment_id = $1', [rows[0].id]);
    return { ...mapRow(rows[0]), workIds: eqWorks.map(ew => ew.work_id) };
  },

  create: async (data) => {
    let workIds = data.workIds || [];
    if (typeof workIds === 'string') { try { workIds = JSON.parse(workIds); } catch (_) { workIds = []; } }

    const { rows } = await query(
      'INSERT INTO equipment (name, inventory_number, description, photo, room_id, category, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [data.name, data.inventoryNumber || '', data.description || '', data.photo || null, data.roomId || null, data.category || '', data.status || 'working']
    );
    const eq = rows[0];

    for (const wid of workIds) {
      await query('INSERT INTO equipment_works (equipment_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [eq.id, wid]);
    }

    return { ...mapRow(eq), workIds };
  },

  update: async (id, data) => {
    const fieldMap = { inventoryNumber: 'inventory_number', roomId: 'room_id' };
    const mapped = {};
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id' || key === 'qrCode' || key === 'createdAt' || key === 'updatedAt' || key === 'workIds') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      mapped[col] = val;
    }
    mapped.updated_at = new Date();

    if (Object.keys(mapped).length > 1) {
      const keys = Object.keys(mapped);
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const vals = keys.map(k => mapped[k]);
      vals.push(id);
      await query(`UPDATE equipment SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    }

    if (data.workIds !== undefined) {
      let ids = data.workIds;
      if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch (_) { ids = []; } }
      await query('DELETE FROM equipment_works WHERE equipment_id = $1', [id]);
      for (const wid of ids) {
        await query('INSERT INTO equipment_works (equipment_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, wid]);
      }
    }

    return await module.exports.findById(id);
  },

  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM equipment WHERE id = $1', [id]);
    return rowCount > 0;
  },

  createMany: async (items) => {
    const results = [];
    for (const item of items) { results.push(await module.exports.create(item)); }
    return results;
  }
};
