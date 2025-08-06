import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface CampaignRequest {
  campaignId: string;
  channels: string[]; // ['email', 'voice', 'whatsapp']
  candidateIds?: string[];
  delay?: number; // delay between channels in minutes
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, channels, candidateIds, delay = 0 }: CampaignRequest = await req.json();

    if (!campaignId || !channels || channels.length === 0) {
      throw new Error('Campaign ID and channels are required');
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    const results = {
      campaignId,
      channels: [],
      summary: {
        total: 0,
        success: 0,
        failed: 0
      }
    };

    // Get intelligent strategy from decision engine before execution
    try {
      const { data: strategyData } = await supabase.functions.invoke('decision-engine', {
        body: { campaignId, action: 'generate_strategy' }
      });

      if (strategyData?.success) {
        console.log('Using intelligent strategy:', strategyData.result);
        // Apply strategy recommendations (could modify channels, delay, etc.)
      }
    } catch (error) {
      console.log('Decision engine unavailable, proceeding with manual configuration');
    }

    // Execute each channel sequentially with delay
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      
      if (i > 0 && delay > 0) {
        // Wait for specified delay between channels
        await new Promise(resolve => setTimeout(resolve, delay * 60 * 1000));
      }

      try {
        let endpoint = '';
        switch (channel) {
          case 'email':
            endpoint = `${Deno.env.get('SUPABASE_URL')}/functions/v1/email-agent`;
            break;
          case 'voice':
            endpoint = `${Deno.env.get('SUPABASE_URL')}/functions/v1/voice-agent`;
            break;
          case 'whatsapp':
            endpoint = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-agent`;
            break;
          default:
            throw new Error(`Unknown channel: ${channel}`);
        }

        const channelResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            campaignId,
            candidateIds
          })
        });

        const channelResult = await channelResponse.json();
        
        results.channels.push({
          channel,
          status: channelResult.success ? 'completed' : 'failed',
          details: channelResult
        });

        if (channelResult.success) {
          results.summary.success += channelResult.sent || channelResult.called || 0;
          results.summary.failed += channelResult.failed || 0;
        }

      } catch (error) {
        console.error(`Failed to execute ${channel} channel:`, error);
        
        results.channels.push({
          channel,
          status: 'failed',
          error: error.message
        });
      }
    }

    results.summary.total = results.summary.success + results.summary.failed;

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    // Log orchestration event
    await supabase
      .from('campaign_analytics')
      .insert({
        campaign_id: campaignId,
        event_type: 'campaign_orchestrated',
        channel: 'orchestrator',
        status: 'success',
        metadata: { 
          channels,
          results: results.summary,
          delay
        },
        timestamp: new Date().toISOString()
      });

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in campaign-orchestrator function:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);