-- FORCE RECREATE CANDIDATES TABLE
-- This ensures the schema is exactly what we expect
DROP TABLE IF EXISTS candidates;

CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Storing UUID but removing constraint for flexibility if auth.users schema varies, adding index
    name TEXT,
    email TEXT,
    phone TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_candidates_user_id ON candidates(user_id);

-- Enable RLS
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Simple permissive policy for now (assuming Service Role or authenticated)
CREATE POLICY "Users allow all on own candidates" ON candidates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- IMPORTANT: Reload the API schema cache
NOTIFY pgrst, 'reload schema';
