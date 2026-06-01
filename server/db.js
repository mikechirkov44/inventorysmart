const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://inventorysmart:inventorysmart_secret@localhost:5433/inventorysmart'
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) DEFAULT '',
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(255) DEFAULT '',
        last_name VARCHAR(255) DEFAULT '',
        middle_name VARCHAR(255) DEFAULT '',
        position VARCHAR(255) DEFAULT '',
        phone VARCHAR(100) DEFAULT '',
        email VARCHAR(255) DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        building VARCHAR(255) DEFAULT '',
        floor VARCHAR(50) DEFAULT '',
        responsible_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS equipment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        qr_code UUID UNIQUE DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        inventory_number VARCHAR(100) DEFAULT '',
        description TEXT DEFAULT '',
        photo VARCHAR(255),
        room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
        category VARCHAR(255) DEFAULT '',
        status VARCHAR(50) DEFAULT 'working',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS works (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        frequency_days INTEGER DEFAULT 30,
        category VARCHAR(255) DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS equipment_works (
        equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
        work_id UUID REFERENCES works(id) ON DELETE CASCADE,
        PRIMARY KEY (equipment_id, work_id)
      );

      CREATE TABLE IF NOT EXISTS work_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
        task_id UUID REFERENCES works(id) ON DELETE SET NULL,
        task_name VARCHAR(255) DEFAULT '',
        status VARCHAR(50) DEFAULT 'pending',
        master_name VARCHAR(255) DEFAULT '',
        notes TEXT DEFAULT '',
        photos JSONB DEFAULT '[]',
        spare_parts_used JSONB DEFAULT '[]',
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS spare_parts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        article VARCHAR(100) DEFAULT '',
        manufacturer VARCHAR(255) DEFAULT '',
        unit VARCHAR(50) DEFAULT 'шт',
        min_stock INTEGER DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS spare_parts_equipment (
        spare_part_id UUID REFERENCES spare_parts(id) ON DELETE CASCADE,
        equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
        PRIMARY KEY (spare_part_id, equipment_id)
      );

      CREATE TABLE IF NOT EXISTS spare_parts_works (
        spare_part_id UUID REFERENCES spare_parts(id) ON DELETE CASCADE,
        work_id UUID REFERENCES works(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 0,
        PRIMARY KEY (spare_part_id, work_id)
      );

      CREATE TABLE IF NOT EXISTS incidents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
        employee_id UUID,
        employee_name VARCHAR(255) DEFAULT '',
        description TEXT DEFAULT '',
        photos JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'new',
        admin_notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS spare_part_receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_number VARCHAR(50) UNIQUE NOT NULL,
        date DATE DEFAULT CURRENT_DATE,
        supplier VARCHAR(255) DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS spare_part_receipt_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_id UUID REFERENCES spare_part_receipts(id) ON DELETE CASCADE,
        spare_part_id UUID REFERENCES spare_parts(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        unit_price NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'info',
        title VARCHAR(255) DEFAULT '',
        message TEXT DEFAULT '',
        equipment_id UUID,
        work_id UUID,
        incident_id UUID,
        read BOOLEAN DEFAULT false,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'шт';
      ALTER TABLE spare_parts_works ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
    `);

    await client.query('COMMIT');
    console.log('Database migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, migrate };
