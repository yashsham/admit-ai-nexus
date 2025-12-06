import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetellCallRequest {
  phone_number: string;
  agent_id: string;
  context?: string;
  document_content?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_number, agent_id, context, document_content } = await req.json() as RetellCallRequest;
    
    if (!phone_number || !agent_id) {
      throw new Error('Phone number and agent ID are required');
    }

    const RETELL_API_KEY = Deno.env.get('RETELL_API_KEY');
    if (!RETELL_API_KEY) {
      throw new Error('Retell API key not configured');
    }

    // Prepare call context with document content if provided
    let callContext = context || 'Professional outreach call';
    if (document_content) {
      callContext += `\n\nDocument Context: ${document_content.substring(0, 1000)}...`;
    }

    // Make call via Retell API
    const retellResponse = await fetch('https://api.retellai.com/create-phone-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_number: "+1234567890", // Replace with your Retell phone number
        to_number: phone_number,
        agent_id: agent_id,
        metadata: {
          context: callContext,
          timestamp: new Date().toISOString()
        }
      }),
    });

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      throw new Error(`Retell API error: ${errorText}`);
    }

    const callResult = await retellResponse.json();
    
    // Log the call to campaign analytics
    await supabase.from('campaign_analytics').insert({
      event_type: 'retell_call_initiated',
      channel: 'voice',
      status: 'initiated',
      metadata: {
        call_id: callResult.call_id,
        phone_number: phone_number,
        agent_id: agent_id,
        context: callContext
      }
    });

    console.log('Retell call initiated:', callResult);

    return new Response(JSON.stringify({
      success: true,
      call_id: callResult.call_id,
      message: 'Call initiated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in retell-agent function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});