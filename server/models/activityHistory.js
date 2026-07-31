const { query } = require('../db');

const SENSITIVE_KEYS = new Set([
  'password', 'currentpassword', 'newpassword', 'password_hash',
  'token', 'authorization', 'apikey', 'api_key', 'licensekey', 'license_key',
]);

function sanitize(value, depth = 0) {
  if (depth > 5 || value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEYS.has(key.toLowerCase()))
      .map(([key, item]) => [key, sanitize(item, depth + 1)])
  );
}

async function recordLogin(data) {
  await query(
    `INSERT INTO login_history
      (company_id, user_id, employee_id, username, company_name, success, failure_reason, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [data.companyId || null, data.userId || null, data.employeeId || null, data.username,
      data.companyName || '', data.success, data.failureReason || null, data.ipAddress || null, data.userAgent || null]
  );
}

async function recordAudit(data) {
  await query(
    `INSERT INTO audit_logs
      (company_id, user_id, employee_id, action, resource, resource_id, method, path, status_code, changes, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [data.companyId, data.userId || null, data.employeeId || null, data.action, data.resource,
      data.resourceId || null, data.method, data.path, data.statusCode, sanitize(data.changes || {}),
      data.ipAddress || null, data.userAgent || null]
  );
}

async function listAudit(companyId, filters = {}) {
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const values = [companyId];
  const where = ['a.company_id = $1'];
  if (filters.resource) { values.push(filters.resource); where.push(`a.resource = $${values.length}`); }
  if (filters.userId) { values.push(filters.userId); where.push(`a.user_id = $${values.length}`); }
  values.push(limit, offset);
  const { rows } = await query(`
    SELECT a.*, u.username, u.full_name
    FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
    WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  return rows;
}

async function listLogins(companyId, filters = {}) {
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const values = [companyId];
  const where = ['l.company_id = $1'];
  if (filters.userId) { values.push(filters.userId); where.push(`l.user_id = $${values.length}`); }
  if (filters.success === 'true' || filters.success === 'false') {
    values.push(filters.success === 'true'); where.push(`l.success = $${values.length}`);
  }
  values.push(limit, offset);
  const { rows } = await query(`
    SELECT l.*, u.full_name
    FROM login_history l LEFT JOIN users u ON u.id = l.user_id
    WHERE ${where.join(' AND ')} ORDER BY l.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  return rows;
}

module.exports = { sanitize, recordLogin, recordAudit, listAudit, listLogins };
