const { query } = require('../db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    incidentId: row.incident_id,
    companyId: row.company_id,
    description: row.description,
    assignedEmployeeId: row.assigned_employee_id,
    assignedEmployeeName: row.assigned_employee_name,
    dueDate: row.due_date,
    status: row.status,
    workOrderId: row.work_order_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  findByIncidentId: async (incidentId, companyId) => {
    const { rows } = await query(
      `SELECT ia.*,
              CONCAT(e.last_name, ' ', e.first_name) AS assigned_employee_name
       FROM incident_actions ia
       LEFT JOIN employees e ON e.id = ia.assigned_employee_id
       WHERE ia.incident_id = $1 AND ia.company_id = $2
       ORDER BY ia.created_at ASC`,
      [incidentId, companyId],
    );
    return rows.map(mapRow);
  },

  findById: async (id, companyId) => {
    const { rows } = await query(
      `SELECT ia.*,
              CONCAT(e.last_name, ' ', e.first_name) AS assigned_employee_name
       FROM incident_actions ia
       LEFT JOIN employees e ON e.id = ia.assigned_employee_id
       WHERE ia.id = $1 AND ia.company_id = $2`,
      [id, companyId],
    );
    return mapRow(rows[0]);
  },

  create: async (data, companyId) => {
    const { rows } = await query(
      `INSERT INTO incident_actions
        (incident_id, company_id, description, assigned_employee_id, due_date, status, work_order_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.incidentId,
        companyId,
        data.description || '',
        data.assignedEmployeeId || null,
        data.dueDate || null,
        data.status || 'planned',
        data.workOrderId || null,
      ],
    );
    return module.exports.findById(rows[0].id, companyId);
  },

  update: async (id, data, companyId) => {
    const fieldMap = {
      assignedEmployeeId: 'assigned_employee_id',
      dueDate: 'due_date',
      workOrderId: 'work_order_id',
    };
    const mapped = {};
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id' || key === 'incidentId' || key === 'companyId' || key === 'createdAt' || key === 'updatedAt') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      mapped[col] = val;
    }
    mapped.updated_at = new Date();
    const keys = Object.keys(mapped);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const vals = keys.map((k) => mapped[k]);
    vals.push(id, companyId);
    const { rowCount } = await query(
      `UPDATE incident_actions SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND company_id = $${vals.length}`,
      vals,
    );
    if (!rowCount) return null;
    return module.exports.findById(id, companyId);
  },

  remove: async (id, companyId) => {
    const { rowCount } = await query(
      'DELETE FROM incident_actions WHERE id = $1 AND company_id = $2',
      [id, companyId],
    );
    return rowCount > 0;
  },

  countByIncidentId: async (incidentId, companyId) => {
    const { rows } = await query(
      'SELECT COUNT(*)::int AS count FROM incident_actions WHERE incident_id = $1 AND company_id = $2',
      [incidentId, companyId],
    );
    return rows[0].count;
  },
};
