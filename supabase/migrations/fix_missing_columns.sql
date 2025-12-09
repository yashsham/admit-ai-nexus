-- Fix missing columns in campaigns table
-- This is necessary if the table existed before the new columns were defined
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS channels TEXT[];
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS schedule_at TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Ensure RLS is enabled
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Reload PostgREST schema cache to ensure API picks up the changes
NOTIFY pgrst, 'reload schema';
