-- Create campaign analytics table for tracking engagement
CREATE TABLE public.campaign_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  candidate_id UUID,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'email', 'voice', 'whatsapp', 'orchestrator'
  status TEXT NOT NULL DEFAULT 'pending', -- 'success', 'failed', 'pending'
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for campaign analytics
CREATE POLICY "Users can view analytics for their campaigns" 
ON public.campaign_analytics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_analytics.campaign_id 
    AND campaigns.user_id::text = auth.uid()::text
  )
);

CREATE POLICY "System can insert analytics events" 
ON public.campaign_analytics 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_campaign_analytics_campaign_id ON public.campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_analytics_timestamp ON public.campaign_analytics(timestamp);
CREATE INDEX idx_campaign_analytics_event_type ON public.campaign_analytics(event_type);
CREATE INDEX idx_campaign_analytics_channel ON public.campaign_analytics(channel);

-- Add agent_config column to campaigns for storing agent settings
ALTER TABLE public.campaigns 
ADD COLUMN agent_config JSONB DEFAULT '{
  "email": {"enabled": false, "template": ""},
  "voice": {"enabled": false, "template": ""},
  "whatsapp": {"enabled": false, "template": ""},
  "delay_minutes": 0
}';

-- Add response tracking columns to candidates
ALTER TABLE public.candidates 
ADD COLUMN email_opened BOOLEAN DEFAULT false,
ADD COLUMN call_answered BOOLEAN DEFAULT false,
ADD COLUMN whatsapp_read BOOLEAN DEFAULT false;