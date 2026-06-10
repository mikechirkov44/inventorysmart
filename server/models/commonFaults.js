const { query } = require('../db');

class CommonFault {
  static async create({ companyId, equipmentId, name }) {
    const { rows } = await query(
      'INSERT INTO common_faults (company_id, equipment_id, name) VALUES ($1, $2, $3) RETURNING *',
      [companyId, equipmentId, name]
    );
    return rows[0];
  }

  static async findAll(companyId) {
    const { rows } = await query(
      `SELECT cf.*, e.name as equipment_name, e.inventory_number
       FROM common_faults cf
       LEFT JOIN equipment e ON e.id = cf.equipment_id
       WHERE cf.company_id = $1
       ORDER BY e.name, cf.name`,
      [companyId]
    );
    return rows;
  }

  static async findById(id, companyId) {
    const { rows } = await query(
      `SELECT cf.*, e.name as equipment_name
       FROM common_faults cf
       LEFT JOIN equipment e ON e.id = cf.equipment_id
       WHERE cf.id = $1 AND cf.company_id = $2`,
      [id, companyId]
    );
    return rows[0] || null;
  }

  static async findByEquipment(equipmentId, companyId) {
    const { rows } = await query(
      `SELECT cf.*, e.name as equipment_name
       FROM common_faults cf
       LEFT JOIN equipment e ON e.id = cf.equipment_id
       WHERE cf.equipment_id = $1 AND cf.company_id = $2
       ORDER BY cf.name`,
      [equipmentId, companyId]
    );
    return rows;
  }

  static async update(id, companyId, { equipmentId, name }) {
    const { rows } = await query(
      'UPDATE common_faults SET equipment_id = $1, name = $2, updated_at = NOW() WHERE id = $3 AND company_id = $4 RETURNING *',
      [equipmentId, name, id, companyId]
    );
    return rows[0];
  }

  static async delete(id, companyId) {
    await query('DELETE FROM common_faults WHERE id = $1 AND company_id = $2', [id, companyId]);
  }
}

module.exports = CommonFault;
