/**
 * @module PositionModel
 * @description Модель для управления должностями (positions) в рамках компании.
 */

const { query } = require('../db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    companyId: row.company_id,
    permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  findAll: async (companyId) => {
    const { rows } = await query(
      'SELECT * FROM positions WHERE company_id = $1 ORDER BY name',
      [companyId]
    );
    return rows.map(mapRow);
  },

  findById: async (id, companyId) => {
    const { rows } = await query(
      'SELECT * FROM positions WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    return mapRow(rows[0]);
  },

  findByName: async (name, companyId) => {
    const { rows } = await query(
      'SELECT * FROM positions WHERE name = $1 AND company_id = $2',
      [name, companyId]
    );
    return mapRow(rows[0]);
  },

  create: async (data) => {
    const { rows } = await query(
      'INSERT INTO positions (name, permissions, company_id) VALUES ($1, $2, $3) RETURNING *',
      [data.name, JSON.stringify(data.permissions || {}), data.companyId]
    );
    return mapRow(rows[0]);
  },

  update: async (id, data, companyId) => {
    const fields = [];
    const values = [];
    let i = 1;
    if (data.name !== undefined) { fields.push(`name = $${i}`); values.push(data.name); i++; }
    if (data.permissions !== undefined) { fields.push(`permissions = $${i}`); values.push(JSON.stringify(data.permissions)); i++; }
    if (fields.length === 0) return null;
    fields.push('updated_at = NOW()');
    values.push(id, companyId);
    const { rows } = await query(
      `UPDATE positions SET ${fields.join(', ')} WHERE id = $${i} AND company_id = $${i + 1} RETURNING *`,
      values
    );
    return mapRow(rows[0]);
  },

  remove: async (id, companyId) => {
    const { rowCount } = await query(
      'DELETE FROM positions WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    return rowCount > 0;
  },

  seedDefaultsForCompany: async (companyId) => {
    const { rows: existing } = await query(
      'SELECT COUNT(*) FROM positions WHERE company_id = $1',
      [companyId]
    );
    if (parseInt(existing[0].count, 10) > 0) return;

    const defaults = [
      ['Администратор', {
        equipment: 'full', employees: 'full', works: 'full', rooms: 'full',
        spareParts: 'full', workOrders: 'full', sparePartsReceipts: 'full',
        scanner: true, schedule: true, incidents: 'full', analytics: true,
        import: true, settings: 'full', instructions: 'full',
        causes: 'full', overdueReasons: 'full', commonFaults: 'full',
      }],
      ['Механик', {
        equipment: 'view', employees: 'none', works: 'none', rooms: 'none',
        spareParts: 'none', workOrders: 'full', sparePartsReceipts: 'none',
        scanner: true, schedule: true, incidents: 'full', analytics: false,
        import: false, settings: 'none', instructions: 'view',
        causes: 'view', overdueReasons: 'view', commonFaults: 'full',
      }],
      ['Руководитель', {
        equipment: 'full', employees: 'full', works: 'full', rooms: 'full',
        spareParts: 'full', workOrders: 'full', sparePartsReceipts: 'full',
        scanner: false, schedule: true, incidents: 'full', analytics: true,
        import: true, settings: 'view', instructions: 'full',
        causes: 'full', overdueReasons: 'full', commonFaults: 'full',
      }],
    ];

    for (const [name, permissions] of defaults) {
      await module.exports.create({ name, permissions, companyId });
    }
  },
};
