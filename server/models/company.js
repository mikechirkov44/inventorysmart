const { query } = require('../db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyName: row.company_name,
    logo: row.logo,
    timezone: row.timezone,
    allowInspectionWithoutQr: row.allow_inspection_without_qr,
    licenseKey: row.license_key || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  get: async () => {
    const { rows } = await query('SELECT * FROM company_settings LIMIT 1');
    if (rows.length === 0) {
      const { rows: inserted } = await query(
        'INSERT INTO company_settings DEFAULT VALUES RETURNING *'
      );
      return mapRow(inserted[0]);
    }
    return mapRow(rows[0]);
  },

  update: async (data) => {
    const existing = await module.exports.get();
    const mapped = {};
    if (data.companyName !== undefined) mapped.company_name = data.companyName;
    if (data.logo !== undefined) mapped.logo = data.logo;
    if (data.timezone !== undefined) mapped.timezone = data.timezone;
    if (data.allowInspectionWithoutQr !== undefined) mapped.allow_inspection_without_qr = data.allowInspectionWithoutQr;
    if (data.licenseKey !== undefined) mapped.license_key = data.licenseKey;
    mapped.updated_at = new Date();

    const keys = Object.keys(mapped);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const vals = keys.map(k => mapped[k]);
    vals.push(existing.id);

    const { rows } = await query(
      `UPDATE company_settings SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return mapRow(rows[0]);
  }
};
