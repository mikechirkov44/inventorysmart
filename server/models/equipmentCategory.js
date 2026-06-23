/**
 * @module EquipmentCategoryModel
 * @description Модель для управления категориями оборудования.
 */

const { query } = require('../db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    companyId: row.company_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  findAll: async (companyId) => {
    const { rows } = await query(
      'SELECT * FROM equipment_categories WHERE company_id = $1 ORDER BY name',
      [companyId]
    );
    return rows.map(mapRow);
  },

  findById: async (id, companyId) => {
    const { rows } = await query(
      'SELECT * FROM equipment_categories WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    return mapRow(rows[0]);
  },

  create: async (data, companyId) => {
    const { rows } = await query(
      'INSERT INTO equipment_categories (name, description, company_id) VALUES ($1, $2, $3) RETURNING *',
      [data.name, data.description || '', companyId]
    );
    return mapRow(rows[0]);
  },

  update: async (id, data, companyId) => {
    const { rows } = await query(
      'UPDATE equipment_categories SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 AND company_id = $4 RETURNING *',
      [data.name, data.description || '', id, companyId]
    );
    return mapRow(rows[0]);
  },

  remove: async (id, companyId) => {
    const { rowCount } = await query(
      'DELETE FROM equipment_categories WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    return rowCount > 0;
  }
};
