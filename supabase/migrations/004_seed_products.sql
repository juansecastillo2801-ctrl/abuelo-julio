-- ============================================================
-- 004_seed_products.sql — Cortes y precios Abuelo Julio
-- ============================================================

-- Limpiar categorías que no aplican
DELETE FROM product_categories WHERE name IN ('Cerdo', 'Pollo', 'Achuras', 'Embutidos');

-- Insertar los 19 cortes
INSERT INTO products (name, unit, price, cost, is_active)
SELECT name, 'kg', price, cost, true
FROM (VALUES
  ('Lomo',                          36000, 30000),
  ('Ojo de bife',                   36000, 30000),
  ('Bife de chorizo',               28000, 23100),
  ('Tapa de cuadril',               22000, 19000),
  ('Vacío',                         28000, 22000),
  ('Roast beef',                    17000, 14000),
  ('Entraña',                       33000, 26500),
  ('Tapa de asado',                 19000, 16000),
  ('Nalga feteada',                 23000, 19500),
  ('Cuadril feteado',               23000, 19500),
  ('Milanesas congeladas',          18000, 13500),
  ('Colita de cuadril',             22000, 17500),
  ('Peceto',                        22000, 18000),
  ('Peceto feteado',                23000, 18600),
  ('Asado plancha 8 costillas',     27000, 23500),
  ('Asado banderita 6 costillas',   30000, 26000),
  ('Asado del centro 6 costillas',  30000, 26000),
  ('Asado emperador 6 costillas',   30000, 26000),
  ('Asado ventana 6 costillas',     31000, 25900)
) AS t(name, price, cost)
ON CONFLICT DO NOTHING;