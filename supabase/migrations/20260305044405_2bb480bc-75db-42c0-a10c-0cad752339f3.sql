ALTER TABLE q_materials
  ADD COLUMN IF NOT EXISTS waste_pct numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS price_cny numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volume_cbm numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_supplier_id uuid REFERENCES q_suppliers(id),
  ADD COLUMN IF NOT EXISTS material_type text DEFAULT 'cost';