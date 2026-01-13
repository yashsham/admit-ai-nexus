-- Analytics Performance Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_executions_campaign_id ON campaign_executions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_status ON campaign_executions (status);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_channel ON campaign_executions (channel);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_executed_at ON campaign_executions (executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates (user_id);
