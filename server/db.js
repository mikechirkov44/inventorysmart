/**
 * @module db
 * @description Модуль подключения к PostgreSQL и миграция схемы БД
 */

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.NODE_ENV === 'production') {
  console.error('FATAL: DATABASE_URL must be set in production');
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString || 'postgresql://inventorysmart:inventorysmart_secret@localhost:5433/inventorysmart',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Выполняет SQL-запрос к базе данных через пул соединений
 * @param {string} text - SQL-запрос с параметрами ($1, $2, ...)
 * @param {Array} [params] - Массив значений параметров запроса
 * @returns {Promise<import('pg').QueryResult>} Результат выполнения запроса
 */
async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

/**
 * Выполняет блок миграции в savepoint, чтобы ошибка не абортила всю транзакцию.
 */
async function withSavepoint(client, name, fn) {
  const sp = `sp_${name}`;
  await client.query(`SAVEPOINT ${sp}`);
  try {
    await fn();
    await client.query(`RELEASE SAVEPOINT ${sp}`);
  } catch (e) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    console.log(`Migration note [${name}]:`, e.message);
  }
}

/**
 * Выполняет миграцию схемы базы данных: создаёт таблицы, добавляет
 * недостающие столбцы и заполняет начальные данные (роли, должности,
 * суперадминистратор, компания по умолчанию)
 * @returns {Promise<void>}
 */
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

      CREATE TABLE IF NOT EXISTS equipment_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        company_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(name, company_id)
      );

      CREATE TABLE IF NOT EXISTS equipment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        qr_code UUID UNIQUE DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        inventory_number VARCHAR(100) DEFAULT '',
        description TEXT DEFAULT '',
        photo VARCHAR(255),
        room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
        category_id UUID REFERENCES equipment_categories(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'working',
        manufacturer VARCHAR(255) DEFAULT '',
        serial_number VARCHAR(100) DEFAULT '',
        year_of_manufacture INTEGER,
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

      CREATE TABLE IF NOT EXISTS common_faults (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Operating hours tracking for equipment
      CREATE TABLE IF NOT EXISTS equipment_operating_hours (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
        company_id UUID,
        unit VARCHAR(100) DEFAULT 'Моточасы (м/ч)',
        current_value DECIMAL(10,2) DEFAULT 0,
        input_date DATE,
        assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
        auto_create_tasks BOOLEAN DEFAULT true,
        prevent_decrease BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(equipment_id)
      );

      -- Maintenance intervals for operating hours
      CREATE TABLE IF NOT EXISTS equipment_maintenance_intervals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operating_hours_id UUID REFERENCES equipment_operating_hours(id) ON DELETE CASCADE,
        interval_value DECIMAL(10,2) NOT NULL,
        last_maintenance_value DECIMAL(10,2) DEFAULT 0,
        description TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS company_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name VARCHAR(255) DEFAULT '',
        logo VARCHAR(255),
        timezone VARCHAR(100) DEFAULT 'Europe/Moscow',
        allow_inspection_without_qr BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'шт';
      ALTER TABLE spare_parts_works ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

      CREATE TABLE IF NOT EXISTS positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        permissions JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id) ON DELETE SET NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

      ALTER TABLE employees ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id) ON DELETE SET NULL;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_title VARCHAR(255) DEFAULT '';

      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS license_key TEXT DEFAULT '';

      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT false;
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS api_key VARCHAR(255) DEFAULT '';

      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID;

      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_id UUID;

      ALTER TABLE incidents ADD COLUMN IF NOT EXISTS common_fault_id UUID REFERENCES common_faults(id) ON DELETE SET NULL;

      -- Many-to-many relationship between common faults and equipment
      CREATE TABLE IF NOT EXISTS common_faults_equipment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        common_fault_id UUID REFERENCES common_faults(id) ON DELETE CASCADE,
        equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(common_fault_id, equipment_id)
      );

      -- Migrate existing equipment_id from common_faults to the new table
      INSERT INTO common_faults_equipment (common_fault_id, equipment_id)
      SELECT id, equipment_id FROM common_faults
      WHERE equipment_id IS NOT NULL
      ON CONFLICT (common_fault_id, equipment_id) DO NOTHING;

      -- Causes of occurrence (причины возникновения)
      CREATE TABLE IF NOT EXISTS causes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Overdue reasons (причины просрочки выполнения работ)
      CREATE TABLE IF NOT EXISTS overdue_reasons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Multi-tenant: add company_id to all data tables and backfill
    const tables = [
      'equipment', 'employees', 'works', 'rooms', 'spare_parts',
      'spare_part_receipts', 'work_orders', 'incidents', 'common_faults',
      'equipment_operating_hours', 'causes', 'overdue_reasons'
    ];
    for (const table of tables) {
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${table}' AND column_name = 'company_id') THEN
            ALTER TABLE ${table} ADD COLUMN company_id UUID;
            UPDATE ${table} SET company_id = (SELECT company_id FROM company_settings ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
          END IF;
        END $$;
      `);
    }

    // Seed default company for existing data
    const { rows: csCount } = await client.query('SELECT COUNT(*) FROM company_settings');
    if (parseInt(csCount[0].count) === 0) {
      const defaultCompanyId = '00000000-0000-0000-0000-000000000001';
      await client.query(
        'INSERT INTO company_settings (id, company_id, company_name) VALUES ($1, $2, $3)',
        [defaultCompanyId, defaultCompanyId, 'Демо компания']
      );
    } else {
      await client.query('UPDATE company_settings SET company_id = gen_random_uuid() WHERE company_id IS NULL');
    }

    // Assign existing users to the first company if not assigned
    await client.query(`
      UPDATE users SET company_id = (
        SELECT company_id FROM company_settings ORDER BY created_at LIMIT 1
      ) WHERE company_id IS NULL
    `);

    // Seed superadmin user — only create if not exists, never overwrite password
    const bcrypt = require('bcryptjs');
    const { rows: saExists } = await client.query("SELECT id FROM users WHERE username = 'superadmin'");
    if (saExists.length === 0) {
      const superadminPassword = process.env.SUPERADMIN_PASSWORD;
      if (!superadminPassword) {
        console.error('FATAL: SUPERADMIN_PASSWORD must be set for initial setup');
        process.exit(1);
      }
      const superadminHash = bcrypt.hashSync(superadminPassword, 10);
      await client.query(`
        INSERT INTO users (username, password_hash, full_name, role)
        VALUES ('superadmin', $1, 'Суперадминистратор', 'superadmin')
      `, [superadminHash]);
      console.log('Superadmin user created');
    }

    // Seed default positions
    const { rows: posCount } = await client.query('SELECT COUNT(*) FROM positions');
    if (parseInt(posCount[0].count) === 0) {
      await client.query(`
        INSERT INTO positions (name, permissions) VALUES
        ('Администратор', '{
          "equipment": "full", "employees": "full", "works": "full",
          "rooms": "full", "spareParts": "full", "workOrders": "full",
          "sparePartsReceipts": "full", "scanner": true, "schedule": true,
          "incidents": "full", "analytics": true, "import": true,
          "settings": "full", "instructions": "full",
          "causes": "full", "overdueReasons": "full",
          "commonFaults": "full"
        }'),
        ('Механик', '{
          "equipment": "view", "employees": "none", "works": "none",
          "rooms": "none", "spareParts": "none", "workOrders": "full",
          "sparePartsReceipts": "none", "scanner": true, "schedule": true,
          "incidents": "full", "analytics": false, "import": false,
          "settings": "none", "instructions": "view",
          "causes": "view", "overdueReasons": "view",
          "commonFaults": "full"
        }'),
        ('Руководитель', '{
          "equipment": "full", "employees": "full", "works": "full",
          "rooms": "full", "spareParts": "full", "workOrders": "full",
          "sparePartsReceipts": "full", "scanner": false, "schedule": true,
          "incidents": "full", "analytics": true, "import": true,
          "settings": "view", "instructions": "full",
          "causes": "full", "overdueReasons": "full",
          "commonFaults": "full"
        }')
      `);
    }

    // Migrate existing users: role='admin' -> Администратор, role='user' -> Механик
    await client.query(`
      UPDATE users SET position_id = (
        SELECT id FROM positions WHERE name = 'Администратор'
      ) WHERE role = 'admin' AND position_id IS NULL
    `);
    await client.query(`
      UPDATE users SET position_id = (
        SELECT id FROM positions WHERE name = 'Механик'
      ) WHERE role = 'user' AND position_id IS NULL
    `);

    // Migrate employees: match free-text position to positions table
    await client.query(`
      UPDATE employees e SET position_id = (
        SELECT id FROM positions p WHERE p.name = e.position
      ) WHERE position_id IS NULL AND position != ''
    `);

    // Ensure Механик has schedule access
    await client.query(`
      UPDATE positions
      SET permissions = jsonb_set(permissions, '{schedule}', 'true')
      WHERE name = 'Механик' AND permissions->>'schedule' = 'false'
    `);

    // Ensure all positions have the new permission keys
    const newPermDefaults = {
      instructions: 'full',
      causes: 'full',
      overdueReasons: 'full',
      commonFaults: 'full'
    };
    for (const [key, defaultVal] of Object.entries(newPermDefaults)) {
      await client.query(`
        UPDATE positions
        SET permissions = jsonb_set(permissions, '{${key}}', '"${defaultVal}"')
        WHERE NOT permissions ? '${key}'
      `);
    }

    await withSavepoint(client, 'equipment_columns', async () => {
      await client.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255) DEFAULT ''`);
      await client.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100) DEFAULT ''`);
      await client.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS year_of_manufacture INTEGER`);
    });

    await withSavepoint(client, 'equipment_categories', async () => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS equipment_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT DEFAULT '',
          company_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await client.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES equipment_categories(id) ON DELETE SET NULL`);
      await client.query(`ALTER TABLE equipment DROP COLUMN IF EXISTS category`);
    });

    await withSavepoint(client, 'new_columns', async () => {
      await client.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS cause_id UUID REFERENCES causes(id) ON DELETE SET NULL`);
      await client.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'B'`);
      await client.query(`ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS cause_id UUID REFERENCES causes(id) ON DELETE SET NULL`);
      await client.query(`ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS overdue_reason_id UUID REFERENCES overdue_reasons(id) ON DELETE SET NULL`);
      await client.query(`ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES users(id) ON DELETE SET NULL`);
      await client.query(`ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ`);
      await client.query(`ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS due_date DATE`);
      await client.query(`ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS completed_on_time BOOLEAN`);
      await client.query(`ALTER TABLE equipment_works ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE`);
      await client.query(`UPDATE equipment_works SET start_date = CURRENT_DATE WHERE start_date IS NULL`);
    });

    await withSavepoint(client, 'theme_color', async () => {
      await client.query(`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS theme_color VARCHAR(20) DEFAULT '#4f46e5'`);
    });

    // Migrate positions to per-company scope (critical — must succeed)
    await client.query('ALTER TABLE positions ADD COLUMN IF NOT EXISTS company_id UUID');
    await client.query('ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_name_key');
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'positions_company_name_key'
        ) THEN
          ALTER TABLE positions ADD CONSTRAINT positions_company_name_key UNIQUE (company_id, name);
        END IF;
      END $$;
    `);

    const { rows: companiesForPositions } = await client.query(
      'SELECT company_id FROM company_settings WHERE company_id IS NOT NULL'
    );
    const { rows: legacyPositions } = await client.query(
      'SELECT * FROM positions WHERE company_id IS NULL ORDER BY name'
    );

    for (const company of companiesForPositions) {
      const { rows: companyPositions } = await client.query(
        'SELECT COUNT(*) FROM positions WHERE company_id = $1',
        [company.company_id]
      );
      if (parseInt(companyPositions[0].count, 10) > 0) continue;

      if (legacyPositions.length > 0) {
        for (const pos of legacyPositions) {
          const { rows: inserted } = await client.query(
            'INSERT INTO positions (name, permissions, company_id) VALUES ($1, $2, $3) RETURNING id',
            [pos.name, pos.permissions, company.company_id]
          );
          await client.query(
            'UPDATE users SET position_id = $1 WHERE company_id = $2 AND position_id = $3',
            [inserted[0].id, company.company_id, pos.id]
          );
          await client.query(
            'UPDATE employees SET position_id = $1 WHERE company_id = $2 AND position_id = $3',
            [inserted[0].id, company.company_id, pos.id]
          );
        }
      } else {
        const Position = require('./models/position');
        await Position.seedDefaultsForCompany(company.company_id);
      }
    }

    if (legacyPositions.length > 0) {
      const legacyIds = legacyPositions.map((p) => p.id);
      await client.query('DELETE FROM positions WHERE id = ANY($1::uuid[])', [legacyIds]);
    }

    await withSavepoint(client, 'notifications_created_at', async () => {
      await client.query(`
        ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
      `);
      await client.query(`
        UPDATE notifications
        SET created_at = COALESCE(read_at, NOW())
        WHERE created_at IS NULL
      `);
    });

    await withSavepoint(client, 'work_orders_created_at', async () => {
      await client.query(`
        UPDATE work_orders
        SET created_at = COALESCE(completed_at, updated_at, NOW())
        WHERE created_at IS NULL
      `);
    });

    await withSavepoint(client, 'rca_incidents', async () => {
      await client.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ`);
      await client.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS root_cause_notes TEXT DEFAULT ''`);
      await client.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_investigator_id UUID REFERENCES employees(id) ON DELETE SET NULL`);
      await client.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS requires_rca BOOLEAN DEFAULT false`);
      await client.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS whys JSONB DEFAULT '[]'`);
      await client.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS downtime_hours DECIMAL(10,2)`);
      await client.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS loss_amount NUMERIC(12,2)`);
      await client.query(`ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS incident_actions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
          company_id UUID,
          description TEXT NOT NULL DEFAULT '',
          assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
          due_date DATE,
          status VARCHAR(50) DEFAULT 'planned',
          work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    });

    await withSavepoint(client, 'company_use_rca', async () => {
      await client.query(`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS use_rca BOOLEAN DEFAULT true`);
    });

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
