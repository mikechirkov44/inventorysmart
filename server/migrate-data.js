const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const DATA_DIR = path.join(__dirname, 'data');

function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function migrateData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Users (preserve password_hash as-is)
    const users = readJson('users.json');
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, username, password_hash, full_name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
        [u.id, u.username, u.passwordHash, u.fullName || '', u.role || 'user', u.createdAt, u.updatedAt]
      );
    }
    console.log(`Migrated ${users.length} users`);

    // 2. Employees
    const employees = readJson('employees.json');
    for (const e of employees) {
      await client.query(
        `INSERT INTO employees (id, first_name, last_name, middle_name, position, phone, email, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
        [e.id, e.firstName || '', e.lastName || '', e.middleName || '', e.position || '', e.phone || '', e.email || '', e.createdAt, e.updatedAt]
      );
    }
    console.log(`Migrated ${employees.length} employees`);

    // 3. Rooms
    const rooms = readJson('rooms.json');
    for (const r of rooms) {
      await client.query(
        `INSERT INTO rooms (id, name, description, building, floor, responsible_employee_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.name, r.description || '', r.building || '', r.floor || '', r.responsibleEmployeeId || null, r.createdAt, r.updatedAt]
      );
    }
    console.log(`Migrated ${rooms.length} rooms`);

    // 4. Works
    const works = readJson('works.json');
    for (const w of works) {
      await client.query(
        `INSERT INTO works (id, name, description, frequency_days, category, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
        [w.id, w.name, w.description || '', w.frequencyDays || 30, w.category || '', w.createdAt, w.updatedAt]
      );
    }
    console.log(`Migrated ${works.length} works`);

    // 5. Equipment + equipment_works
    const equipment = readJson('equipment.json');
    for (const eq of equipment) {
      await client.query(
        `INSERT INTO equipment (id, qr_code, name, inventory_number, description, photo, room_id, category, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING`,
        [eq.id, eq.qrCode, eq.name, eq.inventoryNumber || '', eq.description || '', eq.photo || null, eq.roomId || null, eq.category || '', eq.status || 'working', eq.createdAt, eq.updatedAt]
      );
      const workIds = eq.workIds || [];
      for (const wid of workIds) {
        await client.query(
          'INSERT INTO equipment_works (equipment_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [eq.id, wid]
        );
      }
    }
    console.log(`Migrated ${equipment.length} equipment + relations`);

    // 6. Work Orders
    const workOrders = readJson('work-orders.json');
    for (const wo of workOrders) {
      const photos = Array.isArray(wo.photos) ? wo.photos : [];
      const sparePartsUsed = Array.isArray(wo.sparePartsUsed) ? wo.sparePartsUsed : [];
      await client.query(
        `INSERT INTO work_orders (id, equipment_id, task_id, task_name, status, master_name, notes, photos, spare_parts_used, completed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING`,
        [wo.id, wo.equipmentId, wo.taskId || null, wo.taskName || '', wo.status || 'pending', wo.masterName || '', wo.notes || '', JSON.stringify(photos), JSON.stringify(sparePartsUsed), wo.completedAt || null, wo.createdAt, wo.updatedAt]
      );
    }
    console.log(`Migrated ${workOrders.length} work orders`);

    // 7. Spare Parts + relations
    const spareParts = readJson('spareParts.json');
    for (const sp of spareParts) {
      await client.query(
        `INSERT INTO spare_parts (id, name, article, manufacturer, min_stock, quantity, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [sp.id, sp.name, sp.article || '', sp.manufacturer || '', sp.minStock || 0, sp.quantity || 0, sp.createdAt, sp.updatedAt]
      );
      const equipmentIds = sp.equipmentIds || [];
      for (const eid of equipmentIds) {
        await client.query(
          'INSERT INTO spare_parts_equipment (spare_part_id, equipment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [sp.id, eid]
        );
      }
      const workIds = sp.workIds || [];
      for (const wid of workIds) {
        await client.query(
          'INSERT INTO spare_parts_works (spare_part_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [sp.id, wid]
        );
      }
    }
    console.log(`Migrated ${spareParts.length} spare parts + relations`);

    // 8. Incidents
    const incidents = readJson('incidents.json');
    for (const inc of incidents) {
      const photos = Array.isArray(inc.photos) ? inc.photos : [];
      await client.query(
        `INSERT INTO incidents (id, equipment_id, employee_id, employee_name, description, photos, status, admin_notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
        [inc.id, inc.equipmentId, inc.employeeId || null, inc.employeeName || '', inc.description || '', JSON.stringify(photos), inc.status || 'new', inc.adminNotes || '', inc.createdAt, inc.updatedAt]
      );
    }
    console.log(`Migrated ${incidents.length} incidents`);

    // 9. Notifications
    const notifications = readJson('notifications.json');
    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (id, user_id, type, title, message, equipment_id, work_id, incident_id, read, read_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING`,
        [n.id, n.userId, n.type || 'info', n.title || '', n.message || '', n.equipmentId || null, n.workId || null, n.incidentId || null, n.read || false, n.readAt || null, n.createdAt]
      );
    }
    console.log(`Migrated ${notifications.length} notifications`);

    await client.query('COMMIT');
    console.log('\nData migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

migrateData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
