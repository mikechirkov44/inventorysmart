/**
 * @module IncidentModel
 * @description Модель для управления инцидентами (incidents).
 */

const { query } = require('../db');
const fs = require('fs');
const path = require('path');

const INCIDENT_SELECT = `
  SELECT i.*,
         c.name AS cause_name,
         cf.name AS common_fault_name,
         CONCAT(inv.last_name, ' ', inv.first_name) AS investigator_name
  FROM incidents i
  LEFT JOIN causes c ON c.id = i.cause_id
  LEFT JOIN common_faults cf ON cf.id = i.common_fault_id
  LEFT JOIN employees inv ON inv.id = i.assigned_investigator_id
`;

function parseWhys(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (_) { return []; }
  }
  return [];
}

function mapRow(row) {
  if (!row) return null;
  let photos = row.photos;
  if (typeof photos === 'string') { try { photos = JSON.parse(photos); } catch (_) { photos = []; } }
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    description: row.description,
    photos,
    status: row.status,
    adminNotes: row.admin_notes,
    commonFaultId: row.common_fault_id,
    commonFaultName: row.common_fault_name,
    causeId: row.cause_id,
    causeName: row.cause_name,
    resolvedAt: row.resolved_at,
    rootCauseNotes: row.root_cause_notes || '',
    assignedInvestigatorId: row.assigned_investigator_id,
    investigatorName: row.investigator_name,
    requiresRca: Boolean(row.requires_rca),
    whys: parseWhys(row.whys),
    downtimeHours: row.downtime_hours != null ? Number(row.downtime_hours) : null,
    lossAmount: row.loss_amount != null ? Number(row.loss_amount) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  findAll: async (companyId) => {
    const { rows } = await query(
      `${INCIDENT_SELECT} WHERE i.company_id = $1 ORDER BY i.created_at DESC`,
      [companyId],
    );
    return rows.map(mapRow);
  },

  findById: async (id, companyId) => {
    const { rows } = await query(
      `${INCIDENT_SELECT} WHERE i.id = $1 AND i.company_id = $2`,
      [id, companyId],
    );
    return mapRow(rows[0]);
  },

  findByEquipmentId: async (equipmentId, companyId) => {
    const { rows } = await query(
      `${INCIDENT_SELECT} WHERE i.equipment_id = $1 AND i.company_id = $2 ORDER BY i.created_at DESC`,
      [equipmentId, companyId],
    );
    return rows.map(mapRow);
  },

  countOpenByEquipment: async (equipmentId, companyId, excludeId = null) => {
    const params = [equipmentId, companyId];
    let sql = `SELECT COUNT(*)::int AS count FROM incidents
               WHERE equipment_id = $1 AND company_id = $2
                 AND status NOT IN ('resolved')`;
    if (excludeId) {
      sql += ' AND id != $3';
      params.push(excludeId);
    }
    const { rows } = await query(sql, params);
    return rows[0].count;
  },

  create: async (data, companyId) => {
    const { rows } = await query(
      `INSERT INTO incidents (
        equipment_id, employee_id, employee_name, description, photos, status, admin_notes,
        common_fault_id, cause_id, company_id, requires_rca, downtime_hours, loss_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [
        data.equipmentId,
        data.employeeId || null,
        data.employeeName || '',
        data.description || '',
        JSON.stringify(data.photos || []),
        'new',
        '',
        data.commonFaultId || null,
        data.causeId || null,
        companyId,
        Boolean(data.requiresRca),
        data.downtimeHours ?? null,
        data.lossAmount ?? null,
      ],
    );
    return module.exports.findById(rows[0].id, companyId);
  },

  update: async (id, data, companyId) => {
    const fieldMap = {
      adminNotes: 'admin_notes',
      commonFaultId: 'common_fault_id',
      causeId: 'cause_id',
      rootCauseNotes: 'root_cause_notes',
      assignedInvestigatorId: 'assigned_investigator_id',
      requiresRca: 'requires_rca',
      resolvedAt: 'resolved_at',
      downtimeHours: 'downtime_hours',
      lossAmount: 'loss_amount',
    };
    const mapped = {};
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (col === 'photos' && Array.isArray(val)) {
        mapped[col] = JSON.stringify(val);
      } else if (col === 'whys' && Array.isArray(val)) {
        mapped[col] = JSON.stringify(val);
      } else if (col === 'requires_rca') {
        mapped[col] = Boolean(val);
      } else {
        mapped[col] = val;
      }
    }
    mapped.updated_at = new Date();

    const keys = Object.keys(mapped);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const vals = keys.map((k) => mapped[k]);
    vals.push(id, companyId);
    const { rows } = await query(
      `UPDATE incidents SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND company_id = $${vals.length} RETURNING id`,
      vals,
    );
    if (!rows[0]) return null;
    return module.exports.findById(id, companyId);
  },

  remove: async (id, companyId) => {
    const incident = await module.exports.findById(id, companyId);
    if (incident && incident.photos) {
      let photos = incident.photos;
      if (typeof photos === 'string') { try { photos = JSON.parse(photos); } catch (_) { photos = []; } }
      if (Array.isArray(photos)) {
        photos.forEach((photo) => {
          const photoPath = path.join(__dirname, '..', 'uploads', photo);
          if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
        });
      }
    }
    const { rowCount } = await query('DELETE FROM incidents WHERE id = $1 AND company_id = $2', [id, companyId]);
    return rowCount > 0;
  },

  findWorkOrders: async (incidentId, companyId) => {
    const { rows } = await query(
      'SELECT id, task_name, status, created_at FROM work_orders WHERE incident_id = $1 AND company_id = $2 ORDER BY created_at DESC',
      [incidentId, companyId],
    );
    return rows.map((row) => ({
      id: row.id,
      taskName: row.task_name,
      status: row.status,
      createdAt: row.created_at,
    }));
  },
};
