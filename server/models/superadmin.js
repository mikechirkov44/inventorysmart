const { query } = require('../db');
const bcrypt = require('bcryptjs');

module.exports = {
  findUserByUsername: async (username) => {
    const { rows } = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return rows[0] || null;
  },

  getCompanies: async () => {
    const { rows } = await query(`
      SELECT
        cs.id,
        cs.company_id,
        cs.company_name,
        cs.timezone,
        cs.license_key,
        cs.created_at,
        cs.updated_at,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = cs.company_id) AS user_count
      FROM company_settings cs
      ORDER BY cs.created_at
    `);
    return rows.map(r => {
      let licenseInfo = null;
      if (r.license_key) {
        try {
          const json = Buffer.from(r.license_key, 'base64').toString('utf-8');
          const decoded = JSON.parse(json);
          licenseInfo = { plan: decoded.plan, expiresAt: decoded.expiresAt };
        } catch {}
      }
      return {
        id: r.id,
        companyId: r.company_id,
        companyName: r.company_name,
        timezone: r.timezone,
        userCount: parseInt(r.user_count),
        license: licenseInfo,
        licenseKey: r.license_key || '',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  },

  getAllUsers: async () => {
    const { rows } = await query(`
      SELECT
        u.id, u.username, u.full_name, u.role, u.position_id, u.employee_id,
        u.company_id, u.created_at, u.updated_at,
        p.name AS position_name,
        cs.company_name
      FROM users u
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN company_settings cs ON u.company_id = cs.company_id
      WHERE u.role != 'superadmin'
      ORDER BY u.created_at
    `);
    return rows.map(r => ({
      id: r.id,
      username: r.username,
      fullName: r.full_name,
      role: r.role,
      positionId: r.position_id,
      positionName: r.position_name || null,
      employeeId: r.employee_id,
      companyId: r.company_id,
      companyName: r.company_name || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  generateLicenseKey: (companyId, plan, daysValid) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);
    const payload = { plan, expiresAt: expiresAt.toISOString().split('T')[0], companyId };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  },

  createCompany: async (companyName) => {
    const companyId = require('crypto').randomUUID();
    const { rows } = await query(
      'INSERT INTO company_settings (company_id, company_name) VALUES ($1, $2) RETURNING *',
      [companyId, companyName]
    );
    return {
      id: rows[0].id,
      companyId: rows[0].company_id,
      companyName: rows[0].company_name,
      createdAt: rows[0].created_at,
    };
  },

  updateLicense: async (companyId, licenseKey) => {
    await query(
      'UPDATE company_settings SET license_key = $1, updated_at = NOW() WHERE company_id = $2',
      [licenseKey, companyId]
    );
  },

  createUser: async ({ username, password, fullName, companyId, positionId }) => {
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existing.length > 0) return null;

    const passwordHash = bcrypt.hashSync(password, 10);
    const { rows } = await query(
      `INSERT INTO users (username, password_hash, full_name, role, company_id, position_id)
       VALUES ($1, $2, $3, 'user', $4, $5)
       RETURNING id, username, full_name, role, company_id, position_id, created_at`,
      [username, passwordHash, fullName, companyId, positionId]
    );
    return {
      id: rows[0].id,
      username: rows[0].username,
      fullName: rows[0].full_name,
      role: rows[0].role,
      companyId: rows[0].company_id,
      positionId: rows[0].position_id,
      createdAt: rows[0].created_at,
    };
  },
};
