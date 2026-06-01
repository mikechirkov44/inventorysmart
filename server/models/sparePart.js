const { query } = require('../db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    article: row.article,
    manufacturer: row.manufacturer,
    minStock: row.min_stock,
    quantity: row.quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  findAll: async () => {
    const { rows: parts } = await query('SELECT * FROM spare_parts ORDER BY name');
    const { rows: spEq } = await query('SELECT * FROM spare_parts_equipment');
    const { rows: spWk } = await query('SELECT * FROM spare_parts_works');
    return parts.map(sp => ({
      ...mapRow(sp),
      equipmentIds: spEq.filter(e => e.spare_part_id === sp.id).map(e => e.equipment_id),
      workIds: spWk.filter(w => w.spare_part_id === sp.id).map(w => w.work_id)
    }));
  },

  findById: async (id) => {
    const { rows } = await query('SELECT * FROM spare_parts WHERE id = $1', [id]);
    if (!rows[0]) return null;
    const { rows: spEq } = await query('SELECT equipment_id FROM spare_parts_equipment WHERE spare_part_id = $1', [id]);
    const { rows: spWk } = await query('SELECT work_id FROM spare_parts_works WHERE spare_part_id = $1', [id]);
    return {
      ...mapRow(rows[0]),
      equipmentIds: spEq.map(e => e.equipment_id),
      workIds: spWk.map(w => w.work_id)
    };
  },

  create: async (data) => {
    let equipmentIds = data.equipmentIds || [];
    let workIds = data.workIds || [];
    if (typeof equipmentIds === 'string') { try { equipmentIds = JSON.parse(equipmentIds); } catch (_) { equipmentIds = []; } }
    if (typeof workIds === 'string') { try { workIds = JSON.parse(workIds); } catch (_) { workIds = []; } }

    const { rows } = await query(
      'INSERT INTO spare_parts (name, article, manufacturer, min_stock, quantity) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [data.name || '', data.article || '', data.manufacturer || '', parseInt(data.minStock) || 0, parseInt(data.quantity) || 0]
    );
    const sp = rows[0];

    for (const eid of equipmentIds) {
      await query('INSERT INTO spare_parts_equipment (spare_part_id, equipment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [sp.id, eid]);
    }
    for (const wid of workIds) {
      await query('INSERT INTO spare_parts_works (spare_part_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [sp.id, wid]);
    }

    return await module.exports.findById(sp.id);
  },

  update: async (id, data) => {
    const fieldMap = { minStock: 'min_stock' };
    const mapped = {};
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === 'equipmentIds' || key === 'workIds') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      mapped[col] = val;
    }
    mapped.updated_at = new Date();

    if (Object.keys(mapped).length > 1) {
      const keys = Object.keys(mapped);
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const vals = keys.map(k => mapped[k]);
      vals.push(id);
      await query(`UPDATE spare_parts SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    }

    if (data.equipmentIds !== undefined) {
      let ids = data.equipmentIds;
      if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch (_) { ids = []; } }
      await query('DELETE FROM spare_parts_equipment WHERE spare_part_id = $1', [id]);
      for (const eid of ids) {
        await query('INSERT INTO spare_parts_equipment (spare_part_id, equipment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, eid]);
      }
    }
    if (data.workIds !== undefined) {
      let ids = data.workIds;
      if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch (_) { ids = []; } }
      await query('DELETE FROM spare_parts_works WHERE spare_part_id = $1', [id]);
      for (const wid of ids) {
        await query('INSERT INTO spare_parts_works (spare_part_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, wid]);
      }
    }

    return await module.exports.findById(id);
  },

  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM spare_parts WHERE id = $1', [id]);
    return rowCount > 0;
  },

  deductStock: async (items) => {
    const updated = [];
    for (const { sparePartId, quantity } of items) {
      const qty = parseInt(quantity) || 0;
      if (qty <= 0) continue;
      const { rows } = await query(
        'UPDATE spare_parts SET quantity = GREATEST(0, quantity - $1), updated_at = NOW() WHERE id = $2 RETURNING *',
        [qty, sparePartId]
      );
      if (rows[0]) updated.push(mapRow(rows[0]));
    }
    return updated;
  },

  replenishStock: async (items) => {
    const updated = [];
    for (const { sparePartId, quantity } of items) {
      const qty = parseInt(quantity) || 0;
      if (qty <= 0) continue;
      const { rows } = await query(
        'UPDATE spare_parts SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [qty, sparePartId]
      );
      if (rows[0]) updated.push(mapRow(rows[0]));
    }
    return updated;
  }
};
