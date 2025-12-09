-- Create campaigns table if it doesn't exist (enhancing existing one if needed)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft', -- draft, scheduled, running, completed, failed
    type TEXT, -- generic,whatsapp,email,voice
    goal TEXT, -- The user's input/goal for the campaign
    channels TEXT[], -- Array of channels used in this campaign
    schedule_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Executions (Logs for each run/channel execution)
CREATE TABLE IF NOT EXISTS campaign_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- whatsapp, email, voice
    status TEXT NOT NULL, -- pending, sent, failed, delivered
    recipient TEXT, -- phone number or email
    message_content TEXT,
    metadata JSONB, -- store external IDs (Twilio SID, etc.)
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Metrics (Aggregated stats for dashboard)
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    metric_type TEXT, -- sent, delivered, open, click, response, conversion
    value NUMERIC,
    dimension JSONB, -- e.g., {"channel": "email", "link": "url"}
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automations (Triggers for campaigns)
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- time_based, event_based (e.g., new_signup)
    trigger_config JSONB, -- e.g., cron expression or event filter
    action_type TEXT NOT NULL, -- run_campaign
    action_config JSONB, -- e.g., campaign_id
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own campaigns" ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns" ON campaigns FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view executions for their campaigns" ON campaign_executions FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_executions.campaign_id AND campaigns.user_id = auth.uid())
);

CREATE POLICY "Users can view analytics for their campaigns" ON analytics_metrics FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = analytics_metrics.campaign_id AND campaigns.user_id = auth.uid())
);

CREATE POLICY "Users can manage their own automations" ON automations FOR ALL USING (auth.uid() = user_id);
