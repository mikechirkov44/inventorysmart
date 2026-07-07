/**
 * @module bulkWorkAssign
 * @description Массовое назначение работ на оборудование по фильтрам.
 */

const { query } = require('../db');

function serializeDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().split('T')[0];
  }
  const str = String(value).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function normalizeFilters(filters = {}) {
  return {
    categoryId: filters.categoryId && String(filters.categoryId).trim() !== '' ? filters.categoryId : null,
    roomId: filters.roomId && String(filters.roomId).trim() !== '' ? filters.roomId : null,
    building: filters.building && String(filters.building).trim() !== '' ? filters.building : null,
    status: filters.status && String(filters.status).trim() !== '' ? filters.status : null,
    search: filters.search && String(filters.search).trim() !== ''
      ? `%${String(filters.search).trim()}%`
      : null,
  };
}

/**
 * @param {string} companyId
 * @param {object} filters
 * @param {string|null} workId
 */
async function findMatchingEquipment(companyId, filters, workId = null) {
  const normalized = normalizeFilters(filters);
  const params = [companyId];
  const conditions = ['e.company_id = $1'];
  let paramIndex = 2;

  if (normalized.categoryId) {
    conditions.push(`e.category_id = $${paramIndex}`);
    params.push(normalized.categoryId);
    paramIndex += 1;
  }
  if (normalized.roomId) {
    conditions.push(`e.room_id = $${paramIndex}`);
    params.push(normalized.roomId);
    paramIndex += 1;
  }
  if (normalized.building) {
    conditions.push(`r.building = $${paramIndex}`);
    params.push(normalized.building);
    paramIndex += 1;
  }
  if (normalized.status) {
    conditions.push(`e.status = $${paramIndex}`);
    params.push(normalized.status);
    paramIndex += 1;
  }
  if (normalized.search) {
    conditions.push(`(e.name ILIKE $${paramIndex} OR e.inventory_number ILIKE $${paramIndex})`);
    params.push(normalized.search);
    paramIndex += 1;
  }

  let hasWorkSql = 'false AS has_work';
  if (workId) {
    hasWorkSql = `EXISTS (
      SELECT 1 FROM equipment_works ew
      WHERE ew.equipment_id = e.id AND ew.work_id = $${paramIndex}
    ) AS has_work`;
    params.push(workId);
  }

  const sql = `
    SELECT e.id, e.name, e.inventory_number, e.status,
           r.name AS room_name, r.building,
           ec.name AS category_name,
           ${hasWorkSql}
    FROM equipment e
    LEFT JOIN rooms r ON e.room_id = r.id
    LEFT JOIN equipment_categories ec ON e.category_id = ec.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.name
  `;

  const { rows } = await query(sql, params);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    inventoryNumber: row.inventory_number,
    status: row.status,
    roomName: row.room_name,
    building: row.building,
    categoryName: row.category_name,
    hasWork: Boolean(row.has_work),
  }));
}

async function previewBulkAssign(companyId, workId, filters) {
  const equipment = await findMatchingEquipment(companyId, filters, workId);
  const alreadyAssigned = equipment.filter((item) => item.hasWork).length;

  return {
    totalMatching: equipment.length,
    alreadyAssigned,
    toAssign: equipment.length - alreadyAssigned,
    equipment: equipment.slice(0, 100),
    truncated: equipment.length > 100,
  };
}

async function bulkAssignWork(companyId, { workId, startDate, filters, updateExisting = false }) {
  const normalizedStartDate = serializeDate(startDate) || serializeDate(new Date());
  const equipment = await findMatchingEquipment(companyId, filters, workId);
  const targets = updateExisting ? equipment : equipment.filter((item) => !item.hasWork);

  let assigned = 0;
  for (const item of targets) {
    await query(
      `INSERT INTO equipment_works (equipment_id, work_id, start_date)
       VALUES ($1, $2, $3)
       ON CONFLICT (equipment_id, work_id)
       DO UPDATE SET start_date = EXCLUDED.start_date`,
      [item.id, workId, normalizedStartDate],
    );
    assigned += 1;
  }

  return {
    assigned,
    skipped: equipment.length - targets.length,
    totalMatching: equipment.length,
  };
}

module.exports = {
  previewBulkAssign,
  bulkAssignWork,
  findMatchingEquipment,
};
