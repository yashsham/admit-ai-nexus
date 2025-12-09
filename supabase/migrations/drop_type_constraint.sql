-- Drop the restrictive check constraint on campaign "type"
-- This allows us to store 'generic', 'multi-channel', or any other type string
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_type_check;

-- verify it's gone
NOTIFY pgrst, 'reload schema';
