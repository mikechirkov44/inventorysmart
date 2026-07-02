#!/bin/bash
set -e
cd /opt/inventorysmart

echo "=== Files in container uploads ==="
docker compose exec -T server ls -1 /app/server/uploads | sort

echo ""
echo "=== Files on host (if any) ==="
ls -1 server/uploads 2>/dev/null | sort || echo "(no host uploads dir)"

echo ""
echo "=== Equipment photos in DB ==="
docker compose exec -T db psql -U inventorysmart -d inventorysmart -c \
  "SELECT name, inventory_number, photo FROM equipment WHERE photo IS NOT NULL AND photo != '' ORDER BY name;"

echo ""
echo "=== Company logos in DB ==="
docker compose exec -T db psql -U inventorysmart -d inventorysmart -c \
  "SELECT company_name, logo FROM company_settings WHERE logo IS NOT NULL AND logo != '';"

echo ""
echo "=== Incident photos in DB ==="
docker compose exec -T db psql -U inventorysmart -d inventorysmart -c \
  "SELECT id, photos FROM incidents WHERE photos IS NOT NULL AND photos::text != '[]' LIMIT 20;"

echo ""
echo "=== Missing equipment photos ==="
docker compose exec -T server node -e "
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const dir = '/app/server/uploads';

function basename(v) {
  if (!v) return '';
  let s = String(v).trim();
  if (s.startsWith('/uploads/')) s = s.slice(9);
  if (s.includes('/api/uploads/')) s = s.split('/api/uploads/')[1].split('?')[0];
  return path.basename(s);
}

(async () => {
  const { rows: eq } = await pool.query(\"SELECT name, inventory_number, photo FROM equipment WHERE photo IS NOT NULL AND photo != ''\");
  const { rows: cs } = await pool.query(\"SELECT company_name, logo FROM company_settings WHERE logo IS NOT NULL AND logo != ''\");
  const files = new Set(fs.readdirSync(dir));
  const missing = [];

  for (const r of eq) {
    const f = basename(r.photo);
    if (!files.has(f)) missing.push({ type: 'equipment', name: r.name, inv: r.inventory_number, file: f, stored: r.photo });
  }
  for (const r of cs) {
    const f = basename(r.logo);
    if (!files.has(f)) missing.push({ type: 'logo', name: r.company_name, file: f, stored: r.logo });
  }

  const { rows: inc } = await pool.query(\"SELECT id, photos FROM incidents WHERE photos IS NOT NULL AND photos::text != '[]'\");
  for (const r of inc) {
    const photos = Array.isArray(r.photos) ? r.photos : JSON.parse(r.photos || '[]');
    for (const p of photos) {
      const f = basename(p);
      if (!files.has(f)) missing.push({ type: 'incident', id: r.id, file: f, stored: p });
    }
  }

  if (missing.length === 0) {
    console.log('All referenced files exist on disk.');
  } else {
    missing.forEach(m => console.log(JSON.stringify(m)));
  }
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
"
