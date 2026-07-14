-- ============================================================
-- 013_price_history.sql — Snapshot de costos + historial de precios
-- ============================================================

-- Snapshot del costo en sale_items (para preservar el costo histórico)
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2);

-- Inicializar el unit_cost de items ya existentes con el costo actual del producto
UPDATE sale_items si
SET unit_cost = p.cost
FROM products p
WHERE si.product_id = p.id AND si.unit_cost IS NULL;

-- Historial de cambios de precio
CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price NUMERIC(12,2),
  new_price NUMERIC(12,2),
  old_cost NUMERIC(12,2),
  new_cost NUMERIC(12,2),
  changed_by UUID REFERENCES users(id),
  changed_by_email TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history(product_id, changed_at DESC);

ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_price_history" ON product_price_history
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');