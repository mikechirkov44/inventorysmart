const { query } = require('../db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    frequencyDays: row.frequency_days,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  findAll: async () => {
    const { rows } = await query('SELECT * FROM works ORDER BY name');
    return rows.map(mapRow);
  },

  findById: async (id) => {
    const { rows } = await query('SELECT * FROM works WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  create: async (data) => {
    const { rows } = await query(
      'INSERT INTO works (name, description, frequency_days, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [data.name || '', data.description || '', parseInt(data.frequencyDays) || 30, data.category || '']
    );
    return mapRow(rows[0]);
  },

  update: async (id, data) => {
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
    const { rows } = await query(`UPDATE works SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
    return mapRow(rows[0]);
  },

  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM works WHERE id = $1', [id]);
    return rowCount > 0;
  },

  createMany: async (items) => {
    const results = [];
    for (const item of items) { results.push(await module.exports.create(item)); }
    return results;
  }
};
