-- ============================================================
-- 003_seed_categories.sql — Categorías iniciales de cortes
-- ============================================================

INSERT INTO product_categories (name, sort_order) VALUES
  ('Vacuna', 1),
  ('Cerdo', 2),
  ('Pollo', 3),
  ('Achuras', 4),
  ('Embutidos', 5)
ON CONFLICT (name) DO NOTHING;
