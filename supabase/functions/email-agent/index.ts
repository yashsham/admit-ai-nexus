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

interface EmailRequest {
  campaignId: string;
  candidateIds?: string[];
  template?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, candidateIds, template }: EmailRequest = await req.json();

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, candidates(*)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Filter candidates if specific IDs provided
    let targetCandidates = campaign.candidates;
    if (candidateIds && candidateIds.length > 0) {
      targetCandidates = campaign.candidates.filter((c: any) => candidateIds.includes(c.id));
    }

    const results = [];
    
    for (const candidate of targetCandidates) {
      try {
        // Simulate email sending (in production, use actual email service)
        console.log(`Sending email to ${candidate.email} for campaign ${campaignId}`);
        
        // Update candidate status
        const { error: updateError } = await supabase
          .from('candidates')
          .update({ 
            status: 'email_sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', candidate.id);

        if (updateError) {
          console.error('Failed to update candidate:', updateError);
        }

        // Log analytics event
        await supabase
          .from('campaign_analytics')
          .insert({
            campaign_id: campaignId,
            candidate_id: candidate.id,
            event_type: 'email_sent',
            channel: 'email',
            status: 'success',
            timestamp: new Date().toISOString()
          });

        results.push({
          candidateId: candidate.id,
          status: 'sent',
          email: candidate.email
        });

      } catch (error) {
        console.error(`Failed to send email to ${candidate.email}:`, error);
        
        // Log failed analytics event
        await supabase
          .from('campaign_analytics')
          .insert({
            campaign_id: campaignId,
            candidate_id: candidate.id,
            event_type: 'email_failed',
            channel: 'email',
            status: 'failed',
            timestamp: new Date().toISOString()
          });

        results.push({
          candidateId: candidate.id,
          status: 'failed',
          email: candidate.email,
          error: error.message
        });
      }
    }

    // Update campaign metrics
    const successCount = results.filter(r => r.status === 'sent').length;
    await supabase
      .from('campaigns')
      .update({ 
        messages_sent: (campaign.messages_sent || 0) + successCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    return new Response(JSON.stringify({
      success: true,
      results,
      total: targetCandidates.length,
      sent: successCount,
      failed: results.length - successCount
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in email-agent function:", error);
    
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