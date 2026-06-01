const { query } = require('../db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name,
    position: row.position,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  findAll: async () => {
    const { rows } = await query('SELECT * FROM employees ORDER BY last_name, first_name');
    return rows.map(mapRow);
  },

  findById: async (id) => {
    const { rows } = await query('SELECT * FROM employees WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  create: async (data) => {
    const { rows } = await query(
      'INSERT INTO employees (first_name, last_name, middle_name, position, phone, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.firstName || '', data.lastName || '', data.middleName || '', data.position || '', data.phone || '', data.email || '']
    );
    return mapRow(rows[0]);
  },

  update: async (id, data) => {
    const fieldMap = { firstName: 'first_name', lastName: 'last_name', middleName: 'middle_name' };
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
    const { rows } = await query(`UPDATE employees SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
    return mapRow(rows[0]);
  },

  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM employees WHERE id = $1', [id]);
    return rowCount > 0;
  }
};
