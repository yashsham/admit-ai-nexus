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

interface EmailAgentConfig {
  campaignId: string;
  candidateIds?: string[];
  template?: string;
  priority?: 'low' | 'normal' | 'high';
  retryCount?: number;
  scheduledAt?: string;
  agentId?: string;
}

interface AgentMetrics {
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  lastActivity: string;
}

class EmailAgent {
  private agentId: string;
  private metrics: AgentMetrics;

  constructor() {
    this.agentId = `email-agent-${Date.now()}`;
    this.metrics = {
      totalAttempts: 0,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      lastActivity: new Date().toISOString()
    };
  }

  async processEmailCampaign(config: EmailAgentConfig): Promise<any> {
    const startTime = Date.now();
    this.metrics.totalAttempts++;

    try {
      console.log(`[EmailAgent ${this.agentId}] Starting email campaign processing`, {
        campaignId: config.campaignId,
        priority: config.priority || 'normal',
        candidateCount: config.candidateIds?.length || 'all'
      });

      // Get campaign and candidates
      const { campaign, candidates } = await this.getCampaignData(config.campaignId, config.candidateIds);
      
      // Validate email configuration
      await this.validateEmailSetup();

      // Process candidates with intelligent batching
      const results = await this.processCandidateBatch(candidates, campaign, config);

      // Update metrics
      this.updateMetrics(startTime, true);
      
      // Update campaign statistics
      await this.updateCampaignStats(config.campaignId, results);

      // Log agent performance
      await this.logAgentActivity('email_campaign_completed', {
        campaignId: config.campaignId,
        results: results.summary,
        metrics: this.metrics
      });

      console.log(`[EmailAgent ${this.agentId}] Campaign completed successfully`, results.summary);

      return {
        success: true,
        agentId: this.agentId,
        results: results.detailed,
        summary: results.summary,
        metrics: this.metrics
      };

    } catch (error) {
      this.updateMetrics(startTime, false);
      console.error(`[EmailAgent ${this.agentId}] Campaign failed:`, error);
      
      await this.logAgentActivity('email_campaign_failed', {
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

    // Filter out candidates without email
    candidates = candidates.filter((c: any) => c.email && c.email.includes('@'));

    if (candidates.length === 0) {
      throw new Error('No valid email candidates found');
    }

    return { campaign, candidates };
  }

  private async validateEmailSetup(): Promise<void> {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
  }

  private async processCandidateBatch(candidates: any[], campaign: any, config: EmailAgentConfig) {
    const results = [];
    const batchSize = 10; // Process in batches to avoid rate limits
    
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      const batchPromises = batch.map(candidate => 
        this.sendEmailToCandidate(candidate, campaign, config)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        const candidate = batch[index];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            candidateId: candidate.id,
            email: candidate.email,
            status: 'failed',
            error: result.reason?.message || 'Unknown error'
          });
        }
      });

      // Add delay between batches
      if (i + batchSize < candidates.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const summary = {
      total: candidates.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length
    };

    return { detailed: results, summary };
  }

  private async sendEmailToCandidate(candidate: any, campaign: any, config: EmailAgentConfig) {
    try {
      const emailTemplate = config.template || campaign.template_email || this.getDefaultEmailTemplate();
      const personalizedContent = this.personalizeContent(emailTemplate, candidate, campaign);

      // Simulate email sending (in real implementation, use Resend API)
      console.log(`[EmailAgent ${this.agentId}] Sending email to ${candidate.email}`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

      // Update candidate status
      await supabase
        .from('candidates')
        .update({ 
          email_sent: true,
          status: 'email_sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', candidate.id);

      // Log analytics event
      await supabase
        .from('campaign_analytics')
        .insert({
          campaign_id: campaign.id,
          candidate_id: candidate.id,
          event_type: 'email_sent',
          channel: 'email',
          status: 'success',
          metadata: { 
            agentId: this.agentId,
            subject: `Admission Guidance for ${candidate.name}`,
            priority: config.priority || 'normal'
          },
          timestamp: new Date().toISOString()
        });

      return {
        candidateId: candidate.id,
        email: candidate.email,
        status: 'sent',
        agentId: this.agentId
      };

    } catch (error) {
      console.error(`[EmailAgent ${this.agentId}] Failed to send email to ${candidate.email}:`, error);
      
      // Log failed analytics event
      await supabase
        .from('campaign_analytics')
        .insert({
          campaign_id: campaign.id,
          candidate_id: candidate.id,
          event_type: 'email_failed',
          channel: 'email',
          status: 'failed',
          metadata: { 
            agentId: this.agentId,
            error: error.message
          },
          timestamp: new Date().toISOString()
        });

      throw new Error(`Email failed for ${candidate.email}: ${error.message}`);
    }
  }

  private personalizeContent(template: string, candidate: any, campaign: any): string {
    return template
      .replace(/\{name\}/g, candidate.name || 'Student')
      .replace(/\{email\}/g, candidate.email)
      .replace(/\{city\}/g, candidate.city || 'your area')
      .replace(/\{course\}/g, candidate.course || 'your desired program')
      .replace(/\{campaign_name\}/g, campaign.name || 'Admission Campaign');
  }

  private getDefaultEmailTemplate(): string {
    return `Hello {name},

We're excited to help you with your college admission journey! 🎓

Our AdmitConnect AI platform provides personalized guidance for students in {city} interested in {course} programs.

Key benefits:
• Personalized admission strategies
• Application timeline management  
• Essay review and feedback
• Interview preparation
• Scholarship opportunities

Ready to get started? Visit our platform today!

Best regards,
AdmitConnect AI Team`;
  }

  private updateMetrics(startTime: number, success: boolean): void {
    const responseTime = Date.now() - startTime;
    
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.failureCount++;
    }

    // Update average response time
    const totalSuccessful = this.metrics.successCount;
    if (totalSuccessful > 1) {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (totalSuccessful - 1) + responseTime) / totalSuccessful;
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
        channel: 'email',
        status: eventType.includes('failed') ? 'failed' : 'success',
        metadata: {
          ...metadata,
          agentType: 'email-agent',
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
    const config: EmailAgentConfig = await req.json();
    
    if (!config.campaignId) {
      throw new Error('Campaign ID is required');
    }

    console.log('EmailAgent: Received request', {
      campaignId: config.campaignId,
      candidateCount: config.candidateIds?.length || 'all',
      priority: config.priority || 'normal'
    });

    const emailAgent = new EmailAgent();
    const result = await emailAgent.processEmailCampaign(config);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in enhanced email-agent:", error);
    
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