-- Drop the existing constraint
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_value_check;

-- Add the new constraint allowing values from 0 to 15
ALTER TABLE ratings ADD CONSTRAINT ratings_value_check CHECK (value >= 0 AND value <= 15);
