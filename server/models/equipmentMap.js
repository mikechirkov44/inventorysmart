const { query, pool } = require('../db');

const mapBuilding = (row) => row && ({ id: row.id, name: row.name, sortOrder: row.sort_order, createdAt: row.created_at, updatedAt: row.updated_at });
const mapFloor = (row) => row && ({ id: row.id, buildingId: row.building_id, name: row.name, sortOrder: row.sort_order, canvasWidth: row.canvas_width, canvasHeight: row.canvas_height, version: row.version });
const equipmentSummary = (row) => ({ id: row.id, name: row.name, inventoryNumber: row.inventory_number || '', status: row.status, photo: row.photo, roomId: row.room_id });

async function listBuildings(companyId) {
  const { rows } = await query(`SELECT b.*, COALESCE(json_agg(json_build_object(
    'id', f.id, 'buildingId', f.building_id, 'name', f.name, 'sortOrder', f.sort_order,
    'canvasWidth', f.canvas_width, 'canvasHeight', f.canvas_height, 'version', f.version
  ) ORDER BY f.sort_order, f.name) FILTER (WHERE f.id IS NOT NULL), '[]') AS floors
  FROM map_buildings b LEFT JOIN map_floors f ON f.building_id = b.id AND f.company_id = b.company_id
  WHERE b.company_id = $1 GROUP BY b.id ORDER BY b.sort_order, b.name`, [companyId]);
  return rows.map((row) => ({ ...mapBuilding(row), floors: row.floors }));
}

async function createBuilding(companyId, { name, sortOrder = 0 }) {
  const { rows } = await query('INSERT INTO map_buildings (company_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *', [companyId, String(name || '').trim(), sortOrder]);
  return { ...mapBuilding(rows[0]), floors: [] };
}

async function updateBuilding(companyId, id, { name, sortOrder }) {
  const { rows } = await query(`UPDATE map_buildings SET name = COALESCE($3, name), sort_order = COALESCE($4, sort_order), updated_at = NOW()
    WHERE id = $1 AND company_id = $2 RETURNING *`, [id, companyId, name?.trim() || null, Number.isInteger(sortOrder) ? sortOrder : null]);
  return mapBuilding(rows[0]);
}

async function deleteBuilding(companyId, id) {
  const { rowCount } = await query('DELETE FROM map_buildings WHERE id = $1 AND company_id = $2', [id, companyId]);
  return rowCount > 0;
}

async function createFloor(companyId, buildingId, { name, sortOrder = 0 }) {
  const { rows } = await query(`INSERT INTO map_floors (company_id, building_id, name, sort_order)
    SELECT $1, id, $3, $4 FROM map_buildings WHERE id = $2 AND company_id = $1 RETURNING *`, [companyId, buildingId, String(name || '').trim(), sortOrder]);
  return mapFloor(rows[0]);
}

async function updateFloor(companyId, id, { name, sortOrder }) {
  const { rows } = await query(`UPDATE map_floors SET name = COALESCE($3, name), sort_order = COALESCE($4, sort_order), updated_at = NOW()
    WHERE id = $1 AND company_id = $2 RETURNING *`, [id, companyId, name?.trim() || null, Number.isInteger(sortOrder) ? sortOrder : null]);
  return mapFloor(rows[0]);
}

async function deleteFloor(companyId, id) {
  const { rowCount } = await query('DELETE FROM map_floors WHERE id = $1 AND company_id = $2', [id, companyId]);
  return rowCount > 0;
}

async function getFloor(companyId, id) {
  const { rows: floors } = await query('SELECT * FROM map_floors WHERE id = $1 AND company_id = $2', [id, companyId]);
  if (!floors[0]) return null;
  const [{ rows: elements }, { rows: placements }] = await Promise.all([
    query(`SELECT me.*, r.name AS room_name FROM map_elements me LEFT JOIN rooms r ON r.id = me.room_id
      WHERE me.floor_id = $1 AND me.company_id = $2 ORDER BY me.z_index, me.created_at`, [id, companyId]),
    query(`SELECT p.x, p.y, p.rotation, e.* FROM equipment_map_placements p JOIN equipment e ON e.id = p.equipment_id
      WHERE p.floor_id = $1 AND p.company_id = $2 ORDER BY e.name`, [id, companyId]),
  ]);
  return {
    ...mapFloor(floors[0]),
    elements: elements.map((row) => ({ id: row.id, type: row.type, roomId: row.room_id, roomName: row.room_name, geometry: row.geometry, style: row.style, label: row.label, zIndex: row.z_index })),
    placements: placements.map((row) => ({ equipmentId: row.id, x: Number(row.x), y: Number(row.y), rotation: Number(row.rotation), equipment: equipmentSummary(row) })),
  };
}

async function listUnplaced(companyId, search = '') {
  const pattern = `%${String(search).trim()}%`;
  const { rows } = await query(`SELECT e.* FROM equipment e LEFT JOIN equipment_map_placements p ON p.equipment_id = e.id
    WHERE e.company_id = $1 AND p.equipment_id IS NULL AND ($2 = '%%' OR e.name ILIKE $2 OR e.inventory_number ILIKE $2)
    ORDER BY e.name LIMIT 500`, [companyId, pattern]);
  return rows.map(equipmentSummary);
}

function containingRoom(elements, placement) {
  return elements.find((element) => element.type === 'room'
    && placement.x >= element.geometry.x && placement.x <= element.geometry.x + element.geometry.width
    && placement.y >= element.geometry.y && placement.y <= element.geometry.y + element.geometry.height)?.roomId || null;
}

async function saveLayout(companyId, floorId, layout) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: floors } = await client.query('SELECT * FROM map_floors WHERE id = $1 AND company_id = $2 FOR UPDATE', [floorId, companyId]);
    const floor = floors[0];
    if (!floor) { await client.query('ROLLBACK'); return null; }
    if (floor.version !== layout.version) {
      const error = new Error('План уже изменён другим пользователем');
      error.statusCode = 409;
      error.currentVersion = floor.version;
      throw error;
    }
    const roomIds = layout.elements.filter((item) => item.type === 'room').map((item) => item.roomId);
    if (roomIds.length) {
      const { rows } = await client.query('SELECT id FROM rooms WHERE company_id = $1 AND id = ANY($2::uuid[])', [companyId, roomIds]);
      if (rows.length !== new Set(roomIds).size) { const error = new Error('Одно из помещений недоступно'); error.statusCode = 400; throw error; }
    }
    const equipmentIds = layout.placements.map((item) => item.equipmentId);
    if (equipmentIds.length) {
      const { rows } = await client.query('SELECT id FROM equipment WHERE company_id = $1 AND id = ANY($2::uuid[])', [companyId, equipmentIds]);
      if (rows.length !== equipmentIds.length) { const error = new Error('Одна из единиц оборудования недоступна'); error.statusCode = 400; throw error; }
    }
    await client.query('DELETE FROM map_elements WHERE floor_id = $1 AND company_id = $2', [floorId, companyId]);
    for (const [index, item] of layout.elements.entries()) {
      await client.query(`INSERT INTO map_elements (id, company_id, floor_id, type, room_id, geometry, style, label, z_index)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [item.id, companyId, floorId, item.type, item.roomId || null, item.geometry, item.style || {}, item.label || '', index]);
    }
    await client.query('DELETE FROM equipment_map_placements WHERE floor_id = $1 AND company_id = $2', [floorId, companyId]);
    for (const placement of layout.placements) {
      await client.query(`INSERT INTO equipment_map_placements (equipment_id, company_id, floor_id, x, y, rotation)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (equipment_id) DO UPDATE SET company_id=EXCLUDED.company_id, floor_id=EXCLUDED.floor_id, x=EXCLUDED.x, y=EXCLUDED.y, rotation=EXCLUDED.rotation, updated_at=NOW()`,
      [placement.equipmentId, companyId, floorId, placement.x, placement.y, placement.rotation]);
      const roomId = containingRoom(layout.elements, placement);
      if (roomId) await client.query('UPDATE equipment SET room_id = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3', [roomId, placement.equipmentId, companyId]);
    }
    const { rows } = await client.query('UPDATE map_floors SET version = version + 1, updated_at = NOW() WHERE id = $1 RETURNING version', [floorId]);
    await client.query('COMMIT');
    return { version: rows[0].version };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

module.exports = { listBuildings, createBuilding, updateBuilding, deleteBuilding, createFloor, updateFloor, deleteFloor, getFloor, listUnplaced, saveLayout };
