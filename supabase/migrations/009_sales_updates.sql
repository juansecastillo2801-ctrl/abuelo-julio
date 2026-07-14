ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pendiente' CHECK (delivery_status IN ('pendiente', 'entregado', 'cancelado'));
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE sales ALTER COLUMN customer_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_delivery ON sales(delivery_status);
CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(payment_status);

-- Trigger para descontar stock automáticamente cuando se marca entregado
CREATE OR REPLACE FUNCTION discount_stock_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivery_status = 'entregado' AND OLD.delivery_status != 'entregado' THEN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_delivery ON sales;
CREATE TRIGGER trg_sale_delivery
AFTER UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION discount_stock_on_delivery();
