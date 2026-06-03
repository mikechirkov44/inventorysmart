const { query } = require('../db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  findAll: async () => {
    const { rows } = await query('SELECT * FROM positions ORDER BY name');
    return rows.map(mapRow);
  },

  findById: async (id) => {
    const { rows } = await query('SELECT * FROM positions WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  findByName: async (name) => {
    const { rows } = await query('SELECT * FROM positions WHERE name = $1', [name]);
    return mapRow(rows[0]);
  },

  create: async (data) => {
    const { rows } = await query(
      'INSERT INTO positions (name, permissions) VALUES ($1, $2) RETURNING *',
      [data.name, JSON.stringify(data.permissions || {})]
    );
    return mapRow(rows[0]);
  },

  update: async (id, data) => {
    const fields = [];
    const values = [];
    let i = 1;
    if (data.name !== undefined) { fields.push(`name = $${i}`); values.push(data.name); i++; }
    if (data.permissions !== undefined) { fields.push(`permissions = $${i}`); values.push(JSON.stringify(data.permissions)); i++; }
    if (fields.length === 0) return null;
    fields.push('updated_at = NOW()');
    values.push(id);
    const { rows } = await query(`UPDATE positions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
    return mapRow(rows[0]);
  },

  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM positions WHERE id = $1', [id]);
    return rowCount > 0;
  }
};
