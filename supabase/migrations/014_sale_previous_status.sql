ALTER TABLE sales ADD COLUMN IF NOT EXISTS previous_status TEXT;

-- For already-cancelled sales without a previous_status, assume they were in 'pedir'
UPDATE sales SET previous_status = 'pedir' WHERE status = 'cancelado' AND previous_status IS NULL;
