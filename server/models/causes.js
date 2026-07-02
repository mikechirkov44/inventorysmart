const { query } = require('../db');

class Cause {
  static async create({ companyId, name }) {
    const { rows } = await query(
      'INSERT INTO causes (company_id, name) VALUES ($1, $2) RETURNING *',
      [companyId, name]
    );
    return rows[0];
  }

  static async findAll(companyId) {
    const { rows } = await query(
      'SELECT * FROM causes WHERE company_id = $1 ORDER BY name',
      [companyId]
    );
    return rows;
  }

  static async update(id, companyId, { name }) {
    const { rows } = await query(
      'UPDATE causes SET name = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *',
      [name, id, companyId]
    );
    return rows[0];
  }

  static async delete(id, companyId) {
    await query('DELETE FROM causes WHERE id = $1 AND company_id = $2', [id, companyId]);
  }
}

module.exports = Cause;
