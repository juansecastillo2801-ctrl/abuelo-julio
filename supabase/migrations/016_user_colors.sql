ALTER TABLE users ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL;

-- Asignar colores iniciales a los usuarios existentes (por orden de creación)
WITH ordered_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM users WHERE is_active = true
)
UPDATE users SET color = CASE ordered_users.rn % 8
  WHEN 1 THEN '#60A5FA'
  WHEN 2 THEN '#C084FC'
  WHEN 3 THEN '#F472B6'
  WHEN 4 THEN '#FB923C'
  WHEN 5 THEN '#2DD4BF'
  WHEN 6 THEN '#38BDF8'
  WHEN 7 THEN '#A3E635'
  WHEN 0 THEN '#FB7185'
END
FROM ordered_users WHERE users.id = ordered_users.id AND users.color IS NULL;
