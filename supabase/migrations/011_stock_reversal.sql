CREATE OR REPLACE FUNCTION discount_stock_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Si pasa a entregado: descontar stock
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

  -- Si revierte entrega: reponer stock
  IF NEW.delivery_status != 'entregado' AND OLD.delivery_status = 'entregado' THEN
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

DROP TRIGGER IF EXISTS trg_sale_delivery ON sales;
CREATE TRIGGER trg_sale_delivery
AFTER UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION discount_stock_on_delivery();
