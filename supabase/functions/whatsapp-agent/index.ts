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

interface WhatsAppRequest {
  campaignId: string;
  candidateIds?: string[];
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, candidateIds, message }: WhatsAppRequest = await req.json();

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

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
        const whatsappMessage = message || campaign.template_whatsapp || 
          `Hi ${candidate.name}! 🎓 AdmitConnect AI is here to help you with your college admission journey. Get personalized guidance and support. Visit our platform to get started!`;

        // Send WhatsApp message via Twilio
        const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: 'whatsapp:+14155238886', // Twilio WhatsApp sandbox number
            To: `whatsapp:${candidate.phone}`,
            Body: whatsappMessage
          })
        });

        if (!twilioResponse.ok) {
          const errorText = await twilioResponse.text();
          throw new Error(`Twilio WhatsApp error: ${errorText}`);
        }

        const messageData = await twilioResponse.json();
        
        // Update candidate status
        await supabase
          .from('candidates')
          .update({ 
            whatsapp_sent: true,
            status: 'whatsapp_sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', candidate.id);

        // Log analytics event
        await supabase
          .from('campaign_analytics')
          .insert({
            campaign_id: campaignId,
            candidate_id: candidate.id,
            event_type: 'whatsapp_sent',
            channel: 'whatsapp',
            status: 'success',
            metadata: { message_sid: messageData.sid },
            timestamp: new Date().toISOString()
          });

        results.push({
          candidateId: candidate.id,
          status: 'sent',
          phone: candidate.phone,
          messageSid: messageData.sid
        });

      } catch (error) {
        console.error(`Failed to send WhatsApp to ${candidate.phone}:`, error);
        
        // Log failed analytics event
        await supabase
          .from('campaign_analytics')
          .insert({
            campaign_id: campaignId,
            candidate_id: candidate.id,
            event_type: 'whatsapp_failed',
            channel: 'whatsapp',
            status: 'failed',
            timestamp: new Date().toISOString()
          });

        results.push({
          candidateId: candidate.id,
          status: 'failed',
          phone: candidate.phone,
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
    console.error("Error in whatsapp-agent function:", error);
    
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