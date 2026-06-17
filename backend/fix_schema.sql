
-- Run this in your Supabase SQL Editor
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);

-- Optional: Update existing dummy data if any
UPDATE candidates SET status = 'interested' WHERE tags LIKE '%interested%';
