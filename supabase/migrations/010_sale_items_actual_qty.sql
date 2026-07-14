ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS quantity_requested NUMERIC(10,2);
UPDATE sale_items SET quantity_requested = quantity WHERE quantity_requested IS NULL;
ALTER TABLE sale_items ALTER COLUMN quantity_requested SET NOT NULL;
COMMENT ON COLUMN sale_items.quantity IS 'Cantidad real entregada (final, sobre la que se cobra)';
COMMENT ON COLUMN sale_items.quantity_requested IS 'Cantidad que pidió el cliente originalmente';
