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

interface VoiceRequest {
  campaignId: string;
  candidateIds?: string[];
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, candidateIds, message }: VoiceRequest = await req.json();

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    const googleTtsApiKey = Deno.env.get('GOOGLE_CLOUD_TTS_API_KEY');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    if (!googleTtsApiKey) {
      throw new Error('Google TTS API key not configured');
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
        const voiceMessage = message || campaign.template_voice || 
          `Hello ${candidate.name}, this is AdmitConnect AI. We're here to help you with your college admission journey. Please visit our website to get started.`;

        // Generate speech using Google TTS
        const ttsResponse = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleTtsApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text: voiceMessage },
            voice: {
              languageCode: 'en-US',
              ssmlGender: 'FEMALE'
            },
            audioConfig: {
              audioEncoding: 'MP3'
            }
          })
        });

        if (!ttsResponse.ok) {
          throw new Error('Failed to generate speech');
        }

        const ttsData = await ttsResponse.json();
        
        // Make Twilio call using TwiML
        const twimlUrl = `data:application/xml,${encodeURIComponent(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">${voiceMessage}</Say>
          </Response>`
        )}`;

        const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: candidate.phone,
            Url: twimlUrl
          })
        });

        if (!twilioResponse.ok) {
          const errorText = await twilioResponse.text();
          throw new Error(`Twilio error: ${errorText}`);
        }

        const callData = await twilioResponse.json();
        
        // Update candidate status
        await supabase
          .from('candidates')
          .update({ 
            voice_called: true,
            status: 'voice_called',
            updated_at: new Date().toISOString()
          })
          .eq('id', candidate.id);

        // Log analytics event
        await supabase
          .from('campaign_analytics')
          .insert({
            campaign_id: campaignId,
            candidate_id: candidate.id,
            event_type: 'voice_call_initiated',
            channel: 'voice',
            status: 'success',
            metadata: { call_sid: callData.sid },
            timestamp: new Date().toISOString()
          });

        results.push({
          candidateId: candidate.id,
          status: 'called',
          phone: candidate.phone,
          callSid: callData.sid
        });

      } catch (error) {
        console.error(`Failed to call ${candidate.phone}:`, error);
        
        // Log failed analytics event
        await supabase
          .from('campaign_analytics')
          .insert({
            campaign_id: campaignId,
            candidate_id: candidate.id,
            event_type: 'voice_call_failed',
            channel: 'voice',
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
    const successCount = results.filter(r => r.status === 'called').length;
    await supabase
      .from('campaigns')
      .update({ 
        calls_made: (campaign.calls_made || 0) + successCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    return new Response(JSON.stringify({
      success: true,
      results,
      total: targetCandidates.length,
      called: successCount,
      failed: results.length - successCount
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in voice-agent function:", error);
    
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