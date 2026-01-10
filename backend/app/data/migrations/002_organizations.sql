-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subscription_id TEXT, -- Razorpay Subscription ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Members
CREATE TABLE IF NOT EXISTS organization_members (
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES auth.users(id),
    role TEXT DEFAULT 'member', -- owner, admin, member
    PRIMARY KEY (organization_id, user_id)
);

-- Add org_id to Campaigns (for isolation)
ALTER TABLE campaigns ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(organization_id);

-- Add razorpay fields to User profile (Optional - can be on Org or User)
-- For this design, billing is likely at Organization level.
