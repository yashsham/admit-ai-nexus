-- 1. Daily Analytics Aggregation
CREATE TABLE IF NOT EXISTS analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    campaign_id UUID REFERENCES campaigns(id),
    messages_sent INT DEFAULT 0,
    responses_received INT DEFAULT 0,
    conversions INT DEFAULT 0,
    cost_usd NUMERIC(10, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(date, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_analytics_campaign ON analytics_daily(campaign_id);

-- 2. Raw Staging Table for High Volume Uploads
CREATE TABLE IF NOT EXISTS candidates_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID,
    user_id UUID NOT NULL,
    raw_data JSONB,
    processed BOOLEAN DEFAULT FALSE,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_raw_batch ON candidates_raw(batch_id);
