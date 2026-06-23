CREATE TABLE IF NOT EXISTS equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES equipment_categories(id) ON DELETE SET NULL;
ALTER TABLE equipment DROP COLUMN IF EXISTS category;
