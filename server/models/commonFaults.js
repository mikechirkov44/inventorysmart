const { query } = require('../db');

class CommonFault {
  static async create({ companyId, equipmentIds, name }) {
    const { rows } = await query(
      'INSERT INTO common_faults (company_id, name) VALUES ($1, $2) RETURNING *',
      [companyId, name]
    );
    const fault = rows[0];

    // Create equipment associations
    if (equipmentIds && equipmentIds.length > 0) {
      const values = equipmentIds.map((id, idx) => `($1, $${idx + 2})`).join(', ');
      const params = [fault.id, ...equipmentIds];
      await query(
        `INSERT INTO common_faults_equipment (common_fault_id, equipment_id) VALUES ${values}`,
        params
      );
    }

    return fault;
  }

  static async findAll(companyId) {
    const { rows } = await query(
      `SELECT cf.*,
              array_agg(DISTINCT e.id) FILTER (WHERE e.id IS NOT NULL) as equipment_ids,
              array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL) as equipment_names,
              array_agg(DISTINCT e.inventory_number) FILTER (WHERE e.inventory_number IS NOT NULL) as equipment_inventory_numbers
       FROM common_faults cf
       LEFT JOIN common_faults_equipment cfe ON cfe.common_fault_id = cf.id
       LEFT JOIN equipment e ON e.id = cfe.equipment_id
       WHERE cf.company_id = $1
       GROUP BY cf.id
       ORDER BY cf.name`,
      [companyId]
    );
    return rows;
  }

  static async findById(id, companyId) {
    const { rows } = await query(
      `SELECT cf.*,
              array_agg(DISTINCT e.id) FILTER (WHERE e.id IS NOT NULL) as equipment_ids,
              array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL) as equipment_names
       FROM common_faults cf
       LEFT JOIN common_faults_equipment cfe ON cfe.common_fault_id = cf.id
       LEFT JOIN equipment e ON e.id = cfe.equipment_id
       WHERE cf.id = $1 AND cf.company_id = $2
       GROUP BY cf.id`,
      [id, companyId]
    );
    return rows[0] || null;
  }

  static async findByEquipment(equipmentId, companyId) {
    const { rows } = await query(
      `SELECT cf.*
       FROM common_faults cf
       INNER JOIN common_faults_equipment cfe ON cfe.common_fault_id = cf.id
       WHERE cfe.equipment_id = $1 AND cf.company_id = $2
       ORDER BY cf.name`,
      [equipmentId, companyId]
    );
    return rows;
  }

  static async update(id, companyId, { equipmentIds, name }) {
    const { rows } = await query(
      'UPDATE common_faults SET name = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *',
      [name, id, companyId]
    );

    // Update equipment associations
    await query('DELETE FROM common_faults_equipment WHERE common_fault_id = $1', [id]);
    if (equipmentIds && equipmentIds.length > 0) {
      const values = equipmentIds.map((eid, idx) => `($1, $${idx + 2})`).join(', ');
      const params = [id, ...equipmentIds];
      await query(
        `INSERT INTO common_faults_equipment (common_fault_id, equipment_id) VALUES ${values}`,
        params
      );
    }

    return rows[0];
  }

  static async delete(id, companyId) {
    await query('DELETE FROM common_faults WHERE id = $1 AND company_id = $2', [id, companyId]);
  }
}

module.exports = CommonFault;
