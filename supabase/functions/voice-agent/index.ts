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

interface VoiceAgentConfig {
  campaignId: string;
  candidateIds?: string[];
  message?: string;
  voiceSettings?: {
    voice: string;
    speed: number;
    pitch: number;
  };
  priority?: 'low' | 'normal' | 'high';
  retryCount?: number;
  agentId?: string;
}

interface CallMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageCallDuration: number;
  lastActivity: string;
}

class VoiceAgent {
  private agentId: string;
  private metrics: CallMetrics;

  constructor() {
    this.agentId = `voice-agent-${Date.now()}`;
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageCallDuration: 0,
      lastActivity: new Date().toISOString()
    };
  }

  async processVoiceCampaign(config: VoiceAgentConfig): Promise<any> {
    const startTime = Date.now();
    this.metrics.totalCalls++;

    try {
      console.log(`[VoiceAgent ${this.agentId}] Starting voice campaign processing`, {
        campaignId: config.campaignId,
        priority: config.priority || 'normal',
        candidateCount: config.candidateIds?.length || 'all'
      });

      // Validate voice services
      await this.validateVoiceSetup();

      // Get campaign and candidates
      const { campaign, candidates } = await this.getCampaignData(config.campaignId, config.candidateIds);
      
      // Process candidates with rate limiting
      const results = await this.processCandidateCalls(candidates, campaign, config);

      // Update metrics
      this.updateMetrics(startTime, true);
      
      // Update campaign statistics
      await this.updateCampaignStats(config.campaignId, results);

      // Log agent performance
      await this.logAgentActivity('voice_campaign_completed', {
        campaignId: config.campaignId,
        results: results.summary,
        metrics: this.metrics
      });

      console.log(`[VoiceAgent ${this.agentId}] Campaign completed successfully`, results.summary);

      return {
        success: true,
        agentId: this.agentId,
        results: results.detailed,
        summary: results.summary,
        metrics: this.metrics
      };

    } catch (error: unknown) {
      this.updateMetrics(startTime, false);
      console.error(`[VoiceAgent ${this.agentId}] Campaign failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logAgentActivity('voice_campaign_failed', {
        campaignId: config.campaignId,
        error: errorMessage,
        metrics: this.metrics
      });

      throw error;
    }
  }

  private async getCampaignData(campaignId: string, candidateIds?: string[]) {
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, candidates(*)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    let candidates = campaign.candidates;
    if (candidateIds && candidateIds.length > 0) {
      candidates = campaign.candidates.filter((c: any) => candidateIds.includes(c.id));
    }

    // Filter out candidates without phone
    candidates = candidates.filter((c: any) => c.phone && c.phone.length >= 10);

    if (candidates.length === 0) {
      throw new Error('No valid phone candidates found');
    }

    return { campaign, candidates };
  }

  private async validateVoiceSetup(): Promise<void> {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }
  }

  private async processCandidateCalls(candidates: any[], campaign: any, config: VoiceAgentConfig) {
    const results = [];
    const callDelay = config.priority === 'high' ? 2000 : config.priority === 'low' ? 5000 : 3000;
    
    for (const candidate of candidates) {
      try {
        const result = await this.makeVoiceCall(candidate, campaign, config);
        results.push(result);
        
        // Rate limiting between calls
        if (results.length < candidates.length) {
          await new Promise(resolve => setTimeout(resolve, callDelay));
        }
        
      } catch (error: unknown) {
        console.error(`[VoiceAgent ${this.agentId}] Failed to call ${candidate.phone}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          candidateId: candidate.id,
          phone: candidate.phone,
          status: 'failed',
          error: errorMessage,
          agentId: this.agentId
        });
      }
    }

    const summary = {
      total: candidates.length,
      called: results.filter(r => r.status === 'called').length,
      failed: results.filter(r => r.status === 'failed').length
    };

    return { detailed: results, summary };
  }

  private async makeVoiceCall(candidate: any, campaign: any, config: VoiceAgentConfig) {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

    if (!twilioPhoneNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    try {
      const voiceMessage = config.message || campaign.template_voice || 
        this.getDefaultVoiceMessage(candidate);

      console.log(`[VoiceAgent ${this.agentId}] Initiating call to ${candidate.phone}`);

      // Create TwiML for the call with enhanced features
      const twimlUrl = `data:application/xml,${encodeURIComponent(
        this.generateTwiML(voiceMessage, config.voiceSettings)
      )}`;

      // Make the call using Twilio
      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: candidate.phone,
          Url: twimlUrl,
          StatusCallback: `${Deno.env.get('SUPABASE_URL')}/functions/v1/voice-agent-callback`,
          StatusCallbackEvent: 'completed',
          Record: 'true',
          RecordingStatusCallback: `${Deno.env.get('SUPABASE_URL')}/functions/v1/voice-agent-recording`
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
          campaign_id: campaign.id,
          candidate_id: candidate.id,
          event_type: 'voice_call_initiated',
          channel: 'voice',
          status: 'success',
          metadata: { 
            call_sid: callData.sid,
            agentId: this.agentId,
            priority: config.priority || 'normal',
            voiceSettings: config.voiceSettings
          },
          timestamp: new Date().toISOString()
        });

      return {
        candidateId: candidate.id,
        phone: candidate.phone,
        status: 'called',
        callSid: callData.sid,
        agentId: this.agentId
      };

    } catch (error: unknown) {
      console.error(`[VoiceAgent ${this.agentId}] Call failed for ${candidate.phone}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed analytics event
      await supabase
        .from('campaign_analytics')
        .insert({
          campaign_id: campaign.id,
          candidate_id: candidate.id,
          event_type: 'voice_call_failed',
          channel: 'voice',
          status: 'failed',
          metadata: { 
            agentId: this.agentId,
            error: errorMessage
          },
          timestamp: new Date().toISOString()
        });

      throw error;
    }
  }

  private generateTwiML(message: string, voiceSettings?: any): string {
    const voice = voiceSettings?.voice || 'alice';
    const rate = voiceSettings?.speed ? `${voiceSettings.speed}%` : '100%';
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" rate="${rate}">
    ${message}
  </Say>
  <Gather input="dtmf" numDigits="1" timeout="10" action="${Deno.env.get('SUPABASE_URL')}/functions/v1/voice-agent-response">
    <Say voice="${voice}">
      If you're interested in learning more, press 1. To speak with a counselor, press 2. To be removed from future calls, press 9.
    </Say>
  </Gather>
  <Say voice="${voice}">
    Thank you for your time. Visit our website for more information. Goodbye!
  </Say>
</Response>`;
  }

  private getDefaultVoiceMessage(candidate: any): string {
    return `Hello ${candidate.name}. This is AdmitConnect AI calling about your college admission journey. We provide personalized guidance for students interested in ${candidate.course || 'higher education'} programs. Our platform offers application support, essay assistance, and scholarship opportunities specifically for students in ${candidate.city || 'your area'}. This call should take less than a minute.`;
  }

  private updateMetrics(startTime: number, success: boolean): void {
    const callDuration = Date.now() - startTime;
    
    if (success) {
      this.metrics.successfulCalls++;
      
      // Update average call duration
      const totalSuccessful = this.metrics.successfulCalls;
      if (totalSuccessful > 1) {
        this.metrics.averageCallDuration = 
          (this.metrics.averageCallDuration * (totalSuccessful - 1) + callDuration) / totalSuccessful;
      } else {
        this.metrics.averageCallDuration = callDuration;
      }
    } else {
      this.metrics.failedCalls++;
    }

    this.metrics.lastActivity = new Date().toISOString();
  }

  private async updateCampaignStats(campaignId: string, results: any): Promise<void> {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('calls_made')
      .eq('id', campaignId)
      .single();

    await supabase
      .from('campaigns')
      .update({ 
        calls_made: (campaign?.calls_made || 0) + results.summary.called,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);
  }

  private async logAgentActivity(eventType: string, metadata: any): Promise<void> {
    await supabase
      .from('campaign_analytics')
      .insert({
        campaign_id: metadata.campaignId,
        event_type: eventType,
        channel: 'voice',
        status: eventType.includes('failed') ? 'failed' : 'success',
        metadata: {
          ...metadata,
          agentType: 'voice-agent',
          agentVersion: '2.0'
        },
        timestamp: new Date().toISOString()
      });
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const config: VoiceAgentConfig = await req.json();
    
    if (!config.campaignId) {
      throw new Error('Campaign ID is required');
    }

    console.log('VoiceAgent: Received request', {
      campaignId: config.campaignId,
      candidateCount: config.candidateIds?.length || 'all',
      priority: config.priority || 'normal'
    });

    const voiceAgent = new VoiceAgent();
    const result = await voiceAgent.processVoiceCampaign(config);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in enhanced voice-agent:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);