const { query } = require('../db');
const { parsePeriodQuery } = require('./periodAnalytics');

async function getIncidentAnalytics(companyId, fromStr, toStr) {
  const { from, to } = parsePeriodQuery(fromStr, toStr);
  const fromIso = from.toISOString();
  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);
  const toIso = toEnd.toISOString();

  const { rows: incidents } = await query(
    `SELECT i.*,
            c.name AS cause_name,
            cf.name AS common_fault_name,
            e.name AS equipment_name,
            e.inventory_number
     FROM incidents i
     LEFT JOIN causes c ON c.id = i.cause_id
     LEFT JOIN common_faults cf ON cf.id = i.common_fault_id
     LEFT JOIN equipment e ON e.id = i.equipment_id
     WHERE i.company_id = $1
       AND i.created_at >= $2
       AND i.created_at <= $3
     ORDER BY i.created_at DESC`,
    [companyId, fromIso, toIso],
  );

  const statusCounts = {
    new: 0,
    in_progress: 0,
    investigating: 0,
    rca_done: 0,
    resolved: 0,
  };
  let requiresRcaCount = 0;
  let mttrTotalHours = 0;
  let mttrCount = 0;

  const causeMap = {};
  const faultMap = {};
  const equipmentMap = {};

  const { rows: recurrenceRows } = await query(
    `SELECT COUNT(*)::int AS count FROM incidents i
     WHERE i.company_id = $1
       AND i.created_at >= $2
       AND i.created_at <= $3
       AND i.common_fault_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM incidents p
         WHERE p.company_id = i.company_id
           AND p.equipment_id = i.equipment_id
           AND p.common_fault_id = i.common_fault_id
           AND p.id != i.id
           AND p.created_at < i.created_at
           AND p.created_at >= i.created_at - INTERVAL '90 days'
       )`,
    [companyId, fromIso, toIso],
  );
  const recurrenceCount = recurrenceRows[0].count;

  for (const inc of incidents) {
    const status = inc.status || 'new';
    if (statusCounts[status] !== undefined) statusCounts[status] += 1;
    if (inc.requires_rca) requiresRcaCount += 1;

    if (inc.cause_id) {
      const key = inc.cause_id;
      if (!causeMap[key]) causeMap[key] = { id: key, name: inc.cause_name || 'Без названия', count: 0 };
      causeMap[key].count += 1;
    }

    if (inc.common_fault_id) {
      const key = inc.common_fault_id;
      if (!faultMap[key]) faultMap[key] = { id: key, name: inc.common_fault_name || 'Без названия', count: 0 };
      faultMap[key].count += 1;
    }

    if (inc.equipment_id) {
      const key = inc.equipment_id;
      if (!equipmentMap[key]) {
        equipmentMap[key] = {
          id: key,
          name: inc.equipment_name || '—',
          inventoryNumber: inc.inventory_number || '',
          count: 0,
        };
      }
      equipmentMap[key].count += 1;
    }

    if (inc.status === 'resolved' && inc.resolved_at && inc.created_at) {
      const hours = (new Date(inc.resolved_at) - new Date(inc.created_at)) / (1000 * 60 * 60);
      if (hours >= 0) {
        mttrTotalHours += hours;
        mttrCount += 1;
      }
    }
  }

  const { rows: rcaRows } = await query(
    `SELECT COUNT(*)::int AS count FROM incidents
     WHERE company_id = $1 AND status IN ('investigating', 'rca_done')`,
    [companyId],
  );

  const today = new Date().toISOString().slice(0, 10);
  const { rows: overdueRows } = await query(
    `SELECT COUNT(*)::int AS count FROM incident_actions
     WHERE company_id = $1 AND status = 'planned' AND due_date IS NOT NULL AND due_date < $2`,
    [companyId, today],
  );

  const sortByCount = (arr) => arr.sort((a, b) => b.count - a.count);

  return {
    period: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    summary: {
      total: incidents.length,
      ...statusCounts,
      requiresRca: requiresRcaCount,
      rcaInProgress: rcaRows[0].count,
      overdueActions: overdueRows[0].count,
      mttrHours: mttrCount > 0 ? Math.round((mttrTotalHours / mttrCount) * 10) / 10 : null,
      recurrenceRate: incidents.length > 0
        ? Math.round((recurrenceCount / incidents.length) * 100)
        : 0,
      recurrenceCount,
    },
    byCause: sortByCount(Object.values(causeMap)),
    byCommonFault: sortByCount(Object.values(faultMap)),
    byEquipment: sortByCount(Object.values(equipmentMap)).slice(0, 15),
  };
}

module.exports = { getIncidentAnalytics };
