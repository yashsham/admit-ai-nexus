-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own candidates" ON candidates FOR ALL USING (auth.uid() = user_id);

-- Reload schema
NOTIFY pgrst, 'reload schema';
