const { query } = require('../db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    kpiConfig: typeof row.kpi_config === 'string' ? JSON.parse(row.kpi_config) : row.kpi_config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  findAll: async (companyId) => {
    const { rows } = await query('SELECT * FROM job_positions WHERE company_id = $1 ORDER BY name', [companyId]);
    return rows.map(mapRow);
  },
  findById: async (id, companyId) => {
    const { rows } = await query('SELECT * FROM job_positions WHERE id = $1 AND company_id = $2', [id, companyId]);
    return mapRow(rows[0]);
  },
  findByName: async (name, companyId) => {
    const { rows } = await query('SELECT * FROM job_positions WHERE LOWER(name) = LOWER($1) AND company_id = $2', [name, companyId]);
    return mapRow(rows[0]);
  },
  create: async ({ name, kpiConfig, companyId }) => {
    const { rows } = await query(
      'INSERT INTO job_positions (name, kpi_config, company_id) VALUES ($1, $2, $3) RETURNING *',
      [name, JSON.stringify(kpiConfig || {}), companyId]
    );
    return mapRow(rows[0]);
  },
  update: async (id, data, companyId) => {
    const fields = [];
    const values = [];
    if (data.name !== undefined) { values.push(data.name); fields.push(`name = $${values.length}`); }
    if (data.kpiConfig !== undefined) { values.push(JSON.stringify(data.kpiConfig)); fields.push(`kpi_config = $${values.length}`); }
    if (!fields.length) return module.exports.findById(id, companyId);
    fields.push('updated_at = NOW()');
    values.push(id, companyId);
    const { rows } = await query(`UPDATE job_positions SET ${fields.join(', ')} WHERE id = $${values.length - 1} AND company_id = $${values.length} RETURNING *`, values);
    return mapRow(rows[0]);
  },
  remove: async (id, companyId) => {
    const { rowCount } = await query('DELETE FROM job_positions WHERE id = $1 AND company_id = $2', [id, companyId]);
    return rowCount > 0;
  },
};
