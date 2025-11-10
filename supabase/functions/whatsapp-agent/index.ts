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

interface MessagingAgentConfig {
  campaignId: string;
  candidateIds?: string[];
  message?: string;
  messageType?: 'whatsapp' | 'sms';
  priority?: 'low' | 'normal' | 'high';
  retryCount?: number;
  attachments?: string[];
  agentId?: string;
}

interface MessagingMetrics {
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  averageResponseTime: number;
  deliveryRate: number;
  lastActivity: string;
}

class MessagingAgent {
  private agentId: string;
  private metrics: MessagingMetrics;

  constructor() {
    this.agentId = `messaging-agent-${Date.now()}`;
    this.metrics = {
      totalMessages: 0,
      successfulMessages: 0,
      failedMessages: 0,
      averageResponseTime: 0,
      deliveryRate: 0,
      lastActivity: new Date().toISOString()
    };
  }

  async processMessagingCampaign(config: MessagingAgentConfig): Promise<any> {
    const startTime = Date.now();
    this.metrics.totalMessages++;

    try {
      console.log(`[MessagingAgent ${this.agentId}] Starting messaging campaign`, {
        campaignId: config.campaignId,
        messageType: config.messageType || 'whatsapp',
        priority: config.priority || 'normal',
        candidateCount: config.candidateIds?.length || 'all'
      });

      // Validate messaging services
      await this.validateMessagingSetup(config.messageType);

      // Get campaign and candidates
      const { campaign, candidates } = await this.getCampaignData(config.campaignId, config.candidateIds);
      
      // Process candidates with intelligent scheduling
      const results = await this.processCandidateMessages(candidates, campaign, config);

      // Update metrics
      this.updateMetrics(startTime, true, results);
      
      // Update campaign statistics
      await this.updateCampaignStats(config.campaignId, results);

      // Log agent performance
      await this.logAgentActivity('messaging_campaign_completed', {
        campaignId: config.campaignId,
        results: results.summary,
        metrics: this.metrics
      });

      console.log(`[MessagingAgent ${this.agentId}] Campaign completed successfully`, results.summary);

      return {
        success: true,
        agentId: this.agentId,
        results: results.detailed,
        summary: results.summary,
        metrics: this.metrics
      };

    } catch (error) {
      this.updateMetrics(startTime, false, null);
      console.error(`[MessagingAgent ${this.agentId}] Campaign failed:`, error);
      
      await this.logAgentActivity('messaging_campaign_failed', {
        campaignId: config.campaignId,
        error: error.message,
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

  private async validateMessagingSetup(messageType?: string): Promise<void> {
    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (messageType === 'whatsapp') {
      if (whatsappAccessToken && whatsappPhoneNumberId) {
        console.log(`[MessagingAgent] Meta WhatsApp Business API validated`);
      } else if (twilioAccountSid && twilioAuthToken) {
        console.log(`[MessagingAgent] Twilio WhatsApp validated`);
      } else {
        throw new Error('WhatsApp credentials not configured');
      }
    } else {
      if (!twilioAccountSid || !twilioAuthToken) {
        throw new Error('Twilio credentials not configured for SMS');
      }
      console.log(`[MessagingAgent] SMS messaging validated`);
    }
  }

  private async processCandidateMessages(candidates: any[], campaign: any, config: MessagingAgentConfig) {
    const results = [];
    const messageDelay = this.getMessageDelay(config.priority);
    const batchSize = config.priority === 'high' ? 20 : config.priority === 'low' ? 5 : 10;
    
    // Process in batches to optimize delivery
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      const batchPromises = batch.map(candidate => 
        this.sendMessage(candidate, campaign, config)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        const candidate = batch[index];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            candidateId: candidate.id,
            phone: candidate.phone,
            status: 'failed',
            error: result.reason?.message || 'Unknown error',
            agentId: this.agentId
          });
        }
      });

      // Add delay between batches
      if (i + batchSize < candidates.length) {
        await new Promise(resolve => setTimeout(resolve, messageDelay));
      }
    }

    const summary = {
      total: candidates.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      messageType: config.messageType || 'whatsapp'
    };

    return { detailed: results, summary };
  }

  private async sendMessage(candidate: any, campaign: any, config: MessagingAgentConfig) {
    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    try {
      const messageContent = config.message || campaign.template_whatsapp || 
        this.getDefaultMessage(candidate, config.messageType);

      const personalizedMessage = this.personalizeMessage(messageContent, candidate, campaign);

      console.log(`[MessagingAgent ${this.agentId}] Sending ${config.messageType || 'WhatsApp'} to ${candidate.phone}`);

      let messageData: any;
      let messageSid: string;

      // Use Meta WhatsApp Business API if available, otherwise fall back to Twilio
      if (config.messageType !== 'sms' && whatsappAccessToken && whatsappPhoneNumberId) {
        // Send via Meta WhatsApp Business API
        console.log(`[MessagingAgent ${this.agentId}] Using Meta WhatsApp Business API`);
        
        // Format phone number (remove + if present)
        const phoneNumber = candidate.phone.replace(/^\+/, '');
        
        const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'text',
            text: {
              body: personalizedMessage
            }
          })
        });

        if (!whatsappResponse.ok) {
          const errorText = await whatsappResponse.text();
          throw new Error(`Meta WhatsApp API error: ${errorText}`);
        }

        messageData = await whatsappResponse.json();
        messageSid = messageData.messages?.[0]?.id || 'meta-whatsapp-message';
        
      } else {
        // Send via Twilio (for SMS or WhatsApp fallback)
        console.log(`[MessagingAgent ${this.agentId}] Using Twilio API`);
        
        const messageParams = this.prepareMessageParams(candidate, personalizedMessage, config);

        const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(messageParams)
        });

        if (!twilioResponse.ok) {
          const errorText = await twilioResponse.text();
          throw new Error(`Twilio error: ${errorText}`);
        }

        messageData = await twilioResponse.json();
        messageSid = messageData.sid;
      }
      
      // Update candidate status
      const statusField = config.messageType === 'sms' ? 'sms_sent' : 'whatsapp_sent';
      const statusValue = config.messageType === 'sms' ? 'sms_sent' : 'whatsapp_sent';
      
      await supabase
        .from('candidates')
        .update({ 
          [statusField]: true,
          status: statusValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', candidate.id);

      // Log analytics event
      await supabase
        .from('campaign_analytics')
        .insert({
          campaign_id: campaign.id,
          candidate_id: candidate.id,
          event_type: `${config.messageType || 'whatsapp'}_sent`,
          channel: config.messageType || 'whatsapp',
          status: 'success',
          metadata: { 
            message_sid: messageSid,
            agentId: this.agentId,
            priority: config.priority || 'normal',
            messageLength: personalizedMessage.length,
            hasAttachments: config.attachments && config.attachments.length > 0
          },
          timestamp: new Date().toISOString()
        });

      return {
        candidateId: candidate.id,
        phone: candidate.phone,
        status: 'sent',
        messageSid: messageSid,
        messageType: config.messageType || 'whatsapp',
        agentId: this.agentId
      };

    } catch (error) {
      console.error(`[MessagingAgent ${this.agentId}] Message failed for ${candidate.phone}:`, error);
      
      // Log failed analytics event
      await supabase
        .from('campaign_analytics')
        .insert({
          campaign_id: campaign.id,
          candidate_id: candidate.id,
          event_type: `${config.messageType || 'whatsapp'}_failed`,
          channel: config.messageType || 'whatsapp',
          status: 'failed',
          metadata: { 
            agentId: this.agentId,
            error: error.message
          },
          timestamp: new Date().toISOString()
        });

      throw error;
    }
  }

  private prepareMessageParams(candidate: any, message: string, config: MessagingAgentConfig): Record<string, string> {
    const isWhatsApp = config.messageType !== 'sms';
    const baseParams: Record<string, string> = {
      Body: message
    };

    if (isWhatsApp) {
      baseParams.From = 'whatsapp:+14155238886'; // Twilio WhatsApp sandbox
      baseParams.To = `whatsapp:${candidate.phone}`;
    } else {
      baseParams.From = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
      baseParams.To = candidate.phone;
    }

    // Add status callback for delivery tracking
    baseParams.StatusCallback = `${Deno.env.get('SUPABASE_URL')}/functions/v1/messaging-agent-callback`;

    return baseParams;
  }

  private personalizeMessage(template: string, candidate: any, campaign: any): string {
    return template
      .replace(/\{name\}/g, candidate.name || 'Student')
      .replace(/\{phone\}/g, candidate.phone)
      .replace(/\{city\}/g, candidate.city || 'your area')
      .replace(/\{course\}/g, candidate.course || 'your desired program')
      .replace(/\{campaign_name\}/g, campaign.name || 'Admission Campaign');
  }

  private getDefaultMessage(candidate: any, messageType?: string): string {
    const emoji = messageType === 'sms' ? '' : '🎓✨';
    
    return `Hi ${candidate.name}! ${emoji}

AdmitConnect AI is here to help you with your college admission journey for ${candidate.course || 'your desired program'} in ${candidate.city || 'your area'}.

🔹 Personalized admission strategies
🔹 Application timeline management
🔹 Essay review & feedback
🔹 Interview preparation
🔹 Scholarship opportunities

Ready to get started? Visit our platform today!

Reply STOP to opt out.`;
  }

  private getMessageDelay(priority?: string): number {
    switch (priority) {
      case 'high': return 500;   // 0.5 seconds
      case 'low': return 3000;   // 3 seconds
      default: return 1500;      // 1.5 seconds
    }
  }

  private updateMetrics(startTime: number, success: boolean, results: any): void {
    const responseTime = Date.now() - startTime;
    
    if (success && results) {
      this.metrics.successfulMessages += results.summary.sent;
      this.metrics.failedMessages += results.summary.failed;
      
      // Calculate delivery rate
      const totalAttempts = this.metrics.successfulMessages + this.metrics.failedMessages;
      this.metrics.deliveryRate = totalAttempts > 0 ? 
        (this.metrics.successfulMessages / totalAttempts) * 100 : 0;
    } else {
      this.metrics.failedMessages++;
    }

    // Update average response time
    if (this.metrics.totalMessages > 1) {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.totalMessages - 1) + responseTime) / this.metrics.totalMessages;
    } else {
      this.metrics.averageResponseTime = responseTime;
    }

    this.metrics.lastActivity = new Date().toISOString();
  }

  private async updateCampaignStats(campaignId: string, results: any): Promise<void> {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('messages_sent')
      .eq('id', campaignId)
      .single();

    await supabase
      .from('campaigns')
      .update({ 
        messages_sent: (campaign?.messages_sent || 0) + results.summary.sent,
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
        channel: 'messaging',
        status: eventType.includes('failed') ? 'failed' : 'success',
        metadata: {
          ...metadata,
          agentType: 'messaging-agent',
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
    const config: MessagingAgentConfig = await req.json();
    
    if (!config.campaignId) {
      throw new Error('Campaign ID is required');
    }

    console.log('MessagingAgent: Received request', {
      campaignId: config.campaignId,
      messageType: config.messageType || 'whatsapp',
      candidateCount: config.candidateIds?.length || 'all',
      priority: config.priority || 'normal'
    });

    const messagingAgent = new MessagingAgent();
    const result = await messagingAgent.processMessagingCampaign(config);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in enhanced messaging-agent:", error);
    
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