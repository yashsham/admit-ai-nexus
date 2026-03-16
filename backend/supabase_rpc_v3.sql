-- Function to get comprehensive campaign analytics in one go (Optimized V3)
-- This function is filtered by user_id for correct data isolation and performance.

CREATE OR REPLACE FUNCTION get_campaign_analytics_v3(target_user_id uuid, filter_campaign_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_sent bigint;
    total_delivered bigint;
    interested_count bigint;
    active_campaigns_count bigint;
    responses_received_count bigint;
    calls_made_count bigint;
    
    email_sent bigint;
    email_failed bigint;
    whatsapp_sent bigint;
    whatsapp_failed bigint;
    voice_sent bigint;
    voice_failed bigint;
    
    recent_failures json;
    recent_activity json;
    
    user_campaign_ids uuid[];
    result json;
BEGIN
    -- Get user's campaign IDs once to avoid repeated subqueries
    SELECT array_agg(id) INTO user_campaign_ids FROM campaigns WHERE user_id = target_user_id;

    -- If user has no campaigns, return early with empty stats
    IF user_campaign_ids IS NULL THEN
        RETURN json_build_object(
            'overview', json_build_object(
                'total_sent', 0,
                'delivery_rate', 0,
                'active_campaigns', 0,
                'interested_candidates', 0,
                'calls_made', 0,
                'responses_received', 0
            ),
            'channel_stats', json_build_object(
                'email', json_build_object('sent', 0, 'failed', 0),
                'whatsapp', json_build_object('sent', 0, 'failed', 0),
                'voice', json_build_object('sent', 0, 'failed', 0)
            ),
            'recent_failures', '[]'::json,
            'recent_activity', '[]'::json
        );
    END IF;

    -- Overview Stats
    SELECT COUNT(*) INTO total_sent FROM campaign_executions 
    WHERE campaign_id = ANY(user_campaign_ids)
    AND (filter_campaign_id IS NULL OR campaign_id = filter_campaign_id);

    SELECT COUNT(*) INTO total_delivered FROM campaign_executions 
    WHERE status = 'delivered' 
    AND campaign_id = ANY(user_campaign_ids)
    AND (filter_campaign_id IS NULL OR campaign_id = filter_campaign_id);

    SELECT COUNT(*) INTO interested_count FROM candidates 
    WHERE user_id = target_user_id AND status = 'interested';
    
    SELECT COUNT(*) INTO responses_received_count FROM candidates 
    WHERE user_id = target_user_id AND status = 'responded';
    
    SELECT COUNT(*) INTO active_campaigns_count FROM campaigns 
    WHERE user_id = target_user_id AND status = 'active';

    SELECT COUNT(*) INTO calls_made_count FROM campaign_executions 
    WHERE channel = 'voice'
    AND campaign_id = ANY(user_campaign_ids)
    AND (filter_campaign_id IS NULL OR campaign_id = filter_campaign_id);

    -- Channel Stats (Calculated efficiently)
    -- Email
    SELECT COUNT(*) INTO email_sent FROM campaign_executions 
    WHERE channel = 'email' AND status = 'delivered' 
    AND campaign_id = ANY(user_campaign_ids)
    AND (filter_campaign_id IS NULL OR campaign_id = filter_campaign_id);
    
    SELECT COUNT(*) INTO email_failed FROM campaign_executions 
    WHERE channel = 'email' AND status = 'failed' 
    AND campaign_id = ANY(user_campaign_ids)
    AND (filter_campaign_id IS NULL OR campaign_id = filter_campaign_id);

    -- WhatsApp
    SELECT COUNT(*) INTO whatsapp_sent FROM campaign_executions 
    WHERE channel = 'whatsapp' AND status = 'delivered' 
    AND campaign_id = ANY(user_campaign_ids)
    AND (filter_campaign_id IS NULL OR campaign_id = filter_campaign_id);
    
    SELECT COUNT(*) INTO whatsapp_failed FROM campaign_executions 
    WHERE channel = 'whatsapp' AND status = 'failed' 
    AND campaign_id = ANY(user_campaign_ids)
    AND (filter_campaign_id IS NULL OR campaign_id = filter_campaign_id);
    
    -- Voice (Channel stats detail)
    SELECT COUNT(*) INTO voice_sent FROM campaign_executions 
    WHERE channel = 'voice' AND status = 'delivered' 
    AND campaign_id = ANY(user_campaign_ids)
    AND (filter_campaign_id IS NULL OR campaign_id = filter_campaign_id);
    
    SELECT COUNT(*) INTO voice_failed FROM campaign_executions 
    WHERE channel = 'voice' AND status = 'failed' 
    AND campaign_id = ANY(user_campaign_ids)
    AND (filter_campaign_id IS NULL OR campaign_id = filter_campaign_id);

    -- Recent Failures (JSON)
    SELECT json_agg(t) INTO recent_failures FROM (
        SELECT ce.id, ce.recipient, ce.channel, ce.status, ce.executed_at, ce.message_content, c.name as campaign_name
        FROM campaign_executions ce
        LEFT JOIN campaigns c ON ce.campaign_id = c.id
        WHERE ce.status = 'failed'
        AND ce.campaign_id = ANY(user_campaign_ids)
        AND (filter_campaign_id IS NULL OR ce.campaign_id = filter_campaign_id)
        ORDER BY ce.executed_at DESC
        LIMIT 10
    ) t;

    -- Recent Activity (JSON)
    SELECT json_agg(t) INTO recent_activity FROM (
        SELECT id, status, channel, executed_at 
        FROM campaign_executions
        WHERE campaign_id = ANY(user_campaign_ids)
        AND (filter_campaign_id IS NULL OR campaign_id = filter_campaign_id)
        ORDER BY executed_at DESC
        LIMIT 5
    ) t;

    -- Build Final JSON
    result := json_build_object(
        'overview', json_build_object(
            'total_sent', total_sent,
            'delivery_rate', CASE WHEN total_sent > 0 THEN (total_delivered::numeric / total_sent * 100) ELSE 0 END,
            'active_campaigns', active_campaigns_count,
            'interested_candidates', interested_count,
            'calls_made', calls_made_count,
            'responses_received', responses_received_count
        ),
        'channel_stats', json_build_object(
            'email', json_build_object('sent', email_sent + email_failed, 'failed', email_failed),
            'whatsapp', json_build_object('sent', whatsapp_sent + whatsapp_failed, 'failed', whatsapp_failed),
            'voice', json_build_object('sent', voice_sent + voice_failed, 'failed', voice_failed)
        ),
        'recent_failures', COALESCE(recent_failures, '[]'::json),
        'recent_activity', COALESCE(recent_activity, '[]'::json)
    );

    RETURN result;
END;
$$;
