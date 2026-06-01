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
    role: row.role,
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
    const { rows } = await query('SELECT id, username, full_name, role, created_at, updated_at FROM users ORDER BY created_at');
    return rows.map(mapRow);
  },

  findById: async (id) => {
    const { rows } = await query('SELECT id, username, full_name, role, created_at, updated_at FROM users WHERE id = $1', [id]);
    return mapRow(rows[0]);
  },

  findByUsername: async (username) => {
    const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0] || null;
  },

  create: async (data) => {
    const existing = await module.exports.findByUsername(data.username);
    if (existing) return null;

    const hash = bcrypt.hashSync(data.password, 10);
    const { rows } = await query(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, role, created_at, updated_at',
      [data.username, hash, data.fullName || '', data.role || 'user']
    );
    return mapRow(rows[0]);
  },

  update: async (id, data) => {
    const mapped = {};
    if (data.password) {
      mapped.password_hash = bcrypt.hashSync(data.password, 10);
    }
    if (data.fullName !== undefined) mapped.full_name = data.fullName;
    if (data.role !== undefined) mapped.role = data.role;
    mapped.updated_at = new Date();

    const keys = Object.keys(mapped);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const vals = keys.map(k => mapped[k]);
    vals.push(id);
    const { rows } = await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id, username, full_name, role, created_at, updated_at`, vals);
    return mapRow(rows[0]);
  },

  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount > 0;
  },

  verifyPassword: (plain, hash) => bcrypt.compareSync(plain, hash)
};
