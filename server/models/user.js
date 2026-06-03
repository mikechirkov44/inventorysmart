const { query } = require('../db');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'inventorysmart-secret-key-2026';
const JWT_EXPIRES = '24h';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    positionId: row.position_id,
    employeeId: row.employee_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES,

  ensureAdmin: async () => {
    const { rows } = await query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) === 0) {
      console.log('No users found. Use POST /api/setup to create admin account.');
    }
  },

  isSetupRequired: async () => {
    const { rows } = await query('SELECT COUNT(*) FROM users');
    return parseInt(rows[0].count) === 0;
  },

  findAll: async () => {
    const { rows } = await query(`
      SELECT u.id, u.username, u.full_name, u.position_id, u.employee_id, u.created_at, u.updated_at,
             p.name as position_name, p.permissions as position_permissions,
             e.first_name, e.last_name
      FROM users u
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN employees e ON u.employee_id = e.id
      ORDER BY u.created_at
    `);
    return rows.map(r => ({
      ...mapRow(r),
      positionName: r.position_name || null,
      positionPermissions: r.position_permissions ? (typeof r.position_permissions === 'string' ? JSON.parse(r.position_permissions) : r.position_permissions) : null,
      employeeName: r.first_name && r.last_name ? `${r.last_name} ${r.first_name}` : null
    }));
  },

  findById: async (id) => {
    const { rows } = await query(`
      SELECT u.id, u.username, u.full_name, u.position_id, u.employee_id, u.created_at, u.updated_at,
             p.name as position_name, p.permissions as position_permissions
      FROM users u
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.id = $1
    `, [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      ...mapRow(r),
      positionName: r.position_name || null,
      positionPermissions: r.position_permissions ? (typeof r.position_permissions === 'string' ? JSON.parse(r.position_permissions) : r.position_permissions) : null
    };
  },

  findByIdWithPosition: async (id) => {
    const { rows } = await query(`
      SELECT u.id, u.username, u.full_name, u.position_id, u.employee_id, u.created_at, u.updated_at,
             p.name as position_name, p.permissions as position_permissions
      FROM users u
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.id = $1
    `, [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      ...mapRow(r),
      positionName: r.position_name || null,
      positionPermissions: r.position_permissions ? (typeof r.position_permissions === 'string' ? JSON.parse(r.position_permissions) : r.position_permissions) : null
    };
  },

  findByUsername: async (username) => {
    const { rows } = await query(`
      SELECT u.*, p.name as position_name, p.permissions as position_permissions
      FROM users u
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.username = $1
    `, [username]);
    return rows[0] || null;
  },

  create: async (data) => {
    const existing = await module.exports.findByUsername(data.username);
    if (existing) return null;

    const hash = bcrypt.hashSync(data.password, 10);
    const { rows } = await query(
      'INSERT INTO users (username, password_hash, full_name, position_id, employee_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, position_id, employee_id, created_at, updated_at',
      [data.username, hash, data.fullName || '', data.positionId || null, data.employeeId || null]
    );
    return mapRow(rows[0]);
  },

  update: async (id, data) => {
    const mapped = {};
    if (data.password) {
      mapped.password_hash = bcrypt.hashSync(data.password, 10);
    }
    if (data.fullName !== undefined) mapped.full_name = data.fullName;
    if (data.positionId !== undefined) mapped.position_id = data.positionId;
    if (data.employeeId !== undefined) mapped.employee_id = data.employeeId;
    mapped.updated_at = new Date();

    const keys = Object.keys(mapped);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const vals = keys.map(k => mapped[k]);
    vals.push(id);
    const { rows } = await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id, username, full_name, position_id, employee_id, created_at, updated_at`, vals);
    return mapRow(rows[0]);
  },

  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount > 0;
  },

  verifyPassword: (plain, hash) => bcrypt.compareSync(plain, hash)
};
