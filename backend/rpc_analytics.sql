
-- Function to get comprehensive campaign analytics in one go

CREATE OR REPLACE FUNCTION get_campaign_analytics_v2(filter_campaign_id text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_sent bigint;
    total_delivered bigint;
    interested_count bigint;
    active_campaigns_count bigint;
    
    email_sent bigint;
    email_failed bigint;
    whatsapp_sent bigint;
    whatsapp_failed bigint;
    voice_sent bigint;
    voice_failed bigint;
    
    recent_failures json;
    recent_activity json;
    
    result json;
BEGIN
    SELECT COUNT(*) INTO total_sent FROM campaign_executions 
    WHERE (filter_campaign_id IS NULL OR campaign_id::text = filter_campaign_id);

    SELECT COUNT(*) INTO total_delivered FROM campaign_executions 
    WHERE status = 'delivered' 
    AND (filter_campaign_id IS NULL OR campaign_id::text = filter_campaign_id);

    SELECT COUNT(*) INTO interested_count FROM candidates WHERE status = 'interested';
    
    SELECT COUNT(*) INTO active_campaigns_count FROM campaigns WHERE status = 'active';

    -- Channel Stats
    SELECT COUNT(*) INTO email_sent FROM campaign_executions 
    WHERE channel = 'email' AND status = 'delivered' 
    AND (filter_campaign_id IS NULL OR campaign_id::text = filter_campaign_id);
    
    SELECT COUNT(*) INTO email_failed FROM campaign_executions 
    WHERE channel = 'email' AND status = 'failed' 
    AND (filter_campaign_id IS NULL OR campaign_id::text = filter_campaign_id);

    SELECT COUNT(*) INTO whatsapp_sent FROM campaign_executions 
    WHERE channel = 'whatsapp' AND status = 'delivered' 
    AND (filter_campaign_id IS NULL OR campaign_id::text = filter_campaign_id);
    
    SELECT COUNT(*) INTO whatsapp_failed FROM campaign_executions 
    WHERE channel = 'whatsapp' AND status = 'failed' 
    AND (filter_campaign_id IS NULL OR campaign_id::text = filter_campaign_id);
    
    SELECT COUNT(*) INTO voice_sent FROM campaign_executions 
    WHERE channel = 'voice' AND status = 'delivered' 
    AND (filter_campaign_id IS NULL OR campaign_id::text = filter_campaign_id);
    
    SELECT COUNT(*) INTO voice_failed FROM campaign_executions 
    WHERE channel = 'voice' AND status = 'failed' 
    AND (filter_campaign_id IS NULL OR campaign_id::text = filter_campaign_id);

    -- Recent Failures (JSON)
    SELECT json_agg(t) INTO recent_failures FROM (
        SELECT ce.id, ce.recipient, ce.channel, ce.status, ce.executed_at, ce.message_content, c.name as campaign_name
        FROM campaign_executions ce
        LEFT JOIN campaigns c ON ce.campaign_id = c.id
        WHERE ce.status = 'failed'
        AND (filter_campaign_id IS NULL OR ce.campaign_id::text = filter_campaign_id)
        ORDER BY ce.executed_at DESC
        LIMIT 10
    ) t;

    -- Recent Activity (JSON)
    SELECT json_agg(t) INTO recent_activity FROM (
        SELECT id, status, channel, executed_at 
        FROM campaign_executions
        WHERE (filter_campaign_id IS NULL OR campaign_id::text = filter_campaign_id)
        ORDER BY executed_at DESC
        LIMIT 5
    ) t;

    result := json_build_object(
        'overview', json_build_object(
            'total_sent', total_sent,
            'delivery_rate', CASE WHEN total_sent > 0 THEN (total_delivered::numeric / total_sent * 100) ELSE 0 END,
            'active_campaigns', active_campaigns_count,
            'interested_candidates', interested_count
        ),
        'channel_stats', json_build_object(
            'email', json_build_object('sent', email_sent, 'failed', email_failed),
            'whatsapp', json_build_object('sent', whatsapp_sent, 'failed', whatsapp_failed),
            'voice', json_build_object('sent', voice_sent, 'failed', voice_failed)
        ),
        'recent_failures', COALESCE(recent_failures, '[]'::json),
        'recent_activity', COALESCE(recent_activity, '[]'::json)
    );

    RETURN result;
END;
$$;
