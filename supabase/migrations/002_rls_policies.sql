-- ============================================================
-- 002_rls_policies.sql — Abuelo Julio Gestión
-- ============================================================

-- Helper: get role of authenticated user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get user id
CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── USERS ────────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_all" ON users
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "self_read" ON users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- ── CUSTOMERS ────────────────────────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_customers_all" ON customers
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'vendedor'));

-- ── PRODUCT CATEGORIES ───────────────────────────────────────────────────────
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_categories" ON product_categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_manage_categories" ON product_categories
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- ── PRODUCTS ─────────────────────────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_products" ON products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_manage_products" ON products
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- ── INVENTORY ────────────────────────────────────────────────────────────────
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_inventory" ON inventory
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_manage_inventory" ON inventory
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- ── INVENTORY MOVEMENTS ──────────────────────────────────────────────────────
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_movements" ON inventory_movements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_manage_movements" ON inventory_movements
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

-- ── ORDERS ───────────────────────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_orders_all" ON orders
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'vendedor'));

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_order_items_all" ON order_items
  FOR ALL TO authenticated
  USING (true);

-- ── SALES ────────────────────────────────────────────────────────────────────
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_sales_read" ON sales
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "create_sales" ON sales
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'vendedor'));

CREATE POLICY "admin_manage_sales" ON sales
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_sale_items_all" ON sale_items
  FOR ALL TO authenticated
  USING (true);

-- ── AUDIT LOGS ───────────────────────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_audit" ON audit_logs
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "insert_audit" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
