ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_number SERIAL UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE customers DROP COLUMN IF EXISTS tax_id;
CREATE INDEX IF NOT EXISTS idx_customers_number ON customers(customer_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
