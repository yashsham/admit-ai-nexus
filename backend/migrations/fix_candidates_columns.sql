-- Fix missing columns in candidates table
-- The force_recreate_candidates.sql migration dropped and recreated the table
-- without these columns that the application code depends on.
-- Run this in your Supabase SQL Editor.

-- Core status column (used by analytics, distribution stats, RPC functions)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);

-- Response tracking columns (used by webhooks and distribution stats)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS response_received BOOLEAN DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS call_transcript TEXT;

-- Campaign reference (original schema had this as FK, new schema uses tags instead)
-- Adding as nullable for backward compatibility
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS campaign_id UUID;

-- Additional columns from original schema that code references
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS voice_called BOOLEAN DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sync existing 'interested' tags to status column
UPDATE candidates SET status = 'interested' WHERE 'interested' = ANY(tags) AND status = 'pending';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
