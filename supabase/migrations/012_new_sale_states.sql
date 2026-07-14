-- New sale status model: pedir → encargado → almacenado → entregado
ALTER TABLE sales DROP COLUMN IF EXISTS delivery_status;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pedir'
  CHECK (status IN ('pedir', 'encargado', 'almacenado', 'entregado', 'cancelado'));

-- Supplier payment tracking
ALTER TABLE sales ADD COLUMN IF NOT EXISTS supplier_payment_status TEXT DEFAULT 'por_pagar'
  CHECK (supplier_payment_status IN ('por_pagar', 'pagado'));
ALTER TABLE sales ADD COLUMN IF NOT EXISTS supplier_paid_at TIMESTAMPTZ;

-- Migrate existing data
UPDATE sales SET status = 'entregado' WHERE delivered_at IS NOT NULL;
UPDATE sales SET status = 'pedir' WHERE status IS NULL;

-- Drop old trigger
DROP TRIGGER IF EXISTS trg_sale_delivery ON sales;

-- New stock trigger: fires only on status changes, only for entregado transitions
CREATE OR REPLACE FUNCTION manage_sale_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Pasar a entregado: descontar stock
  IF NEW.status = 'entregado' AND OLD.status != 'entregado' THEN
    UPDATE inventory inv
    SET current_stock = inv.current_stock - si.quantity,
        updated_at = now()
    FROM sale_items si
    WHERE si.sale_id = NEW.id AND inv.product_id = si.product_id;

    INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_id, notes, created_by)
    SELECT si.product_id, -si.quantity, 'venta', NEW.id, 'Venta #' || NEW.sale_number, NEW.sold_by
    FROM sale_items si
    WHERE si.sale_id = NEW.id;
  END IF;

  -- Revertir desde entregado: reponer stock
  IF NEW.status != 'entregado' AND OLD.status = 'entregado' THEN
    UPDATE inventory inv
    SET current_stock = inv.current_stock + si.quantity,
        updated_at = now()
    FROM sale_items si
    WHERE si.sale_id = NEW.id AND inv.product_id = si.product_id;

    INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_id, notes, created_by)
    SELECT si.product_id, si.quantity, 'ajuste', NEW.id, 'Reversión venta #' || NEW.sale_number, NEW.sold_by
    FROM sale_items si
    WHERE si.sale_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_stock
AFTER UPDATE OF status ON sales
FOR EACH ROW
EXECUTE FUNCTION manage_sale_stock();
