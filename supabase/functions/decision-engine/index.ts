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

interface DecisionRequest {
  campaignId: string;
  candidateId?: string;
  context?: any;
}

interface DecisionRule {
  id: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
}

class DecisionEngine {
  private rules: DecisionRule[] = [
    {
      id: "email_first",
      condition: "candidate.email && !candidate.email_sent",
      action: "send_email",
      priority: 1,
      enabled: true
    },
    {
      id: "voice_followup",
      condition: "candidate.email_sent && !candidate.email_opened && daysSince(candidate.email_sent) >= 2",
      action: "make_voice_call",
      priority: 2,
      enabled: true
    },
    {
      id: "whatsapp_engagement",
      condition: "candidate.phone && candidate.email_opened && !candidate.response_received",
      action: "send_whatsapp",
      priority: 3,
      enabled: true
    },
    {
      id: "high_priority_immediate",
      condition: "candidate.priority === 'high'",
      action: "multi_channel_blast",
      priority: 0,
      enabled: true
    }
  ];

  async evaluateCandidate(candidate: any, campaign: any): Promise<string[]> {
    const context = {
      candidate,
      campaign,
      daysSince: (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
      }
    };

    const applicableActions: string[] = [];

    for (const rule of this.rules.filter(r => r.enabled).sort((a, b) => a.priority - b.priority)) {
      try {
        const conditionResult = this.evaluateCondition(rule.condition, context);
        if (conditionResult) {
          applicableActions.push(rule.action);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }

    return applicableActions;
  }

  private evaluateCondition(condition: string, context: any): boolean {
    try {
      // Simple condition evaluator - in production, use a proper expression parser
      const func = new Function('candidate', 'campaign', 'daysSince', `return ${condition}`);
      return func(context.candidate, context.campaign, context.daysSince);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  async generateStrategy(campaignId: string): Promise<any> {
    // Get campaign and candidates
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    const { data: candidates } = await supabase
      .from('candidates')
      .select('*')
      .eq('campaign_id', campaignId);

    if (!campaign || !candidates) {
      throw new Error('Campaign or candidates not found');
    }

    const strategy = {
      campaignId,
      totalCandidates: candidates.length,
      recommendations: [],
      channelPriority: [],
      estimatedTimeline: {},
      effectiveness: {}
    };

    // Analyze candidates and generate recommendations
    for (const candidate of candidates) {
      const actions = await this.evaluateCandidate(candidate, campaign);
      
      strategy.recommendations.push({
        candidateId: candidate.id,
        name: candidate.name,
        recommendedActions: actions,
        priority: this.calculatePriority(candidate, campaign),
        estimatedConversionRate: this.estimateConversion(candidate, actions)
      });
    }

    // Generate channel priority based on effectiveness
    strategy.channelPriority = this.calculateChannelPriority(strategy.recommendations);
    strategy.estimatedTimeline = this.generateTimeline(strategy.recommendations);
    strategy.effectiveness = this.calculateEffectiveness(strategy.recommendations);

    return strategy;
  }

  private calculatePriority(candidate: any, campaign: any): number {
    let score = 50; // Base score
    
    if (candidate.email) score += 20;
    if (candidate.phone) score += 15;
    if (candidate.course === campaign.target_course) score += 25;
    if (candidate.city === campaign.target_city) score += 10;
    
    return Math.min(100, score);
  }

  private estimateConversion(candidate: any, actions: string[]): number {
    const baseRate = 0.15; // 15% base conversion
    let multiplier = 1;
    
    if (actions.includes('send_email')) multiplier += 0.3;
    if (actions.includes('make_voice_call')) multiplier += 0.5;
    if (actions.includes('send_whatsapp')) multiplier += 0.2;
    if (actions.includes('multi_channel_blast')) multiplier += 0.8;
    
    return Math.min(0.95, baseRate * multiplier);
  }

  private calculateChannelPriority(recommendations: any[]): string[] {
    const channelScores = {
      email: 0,
      voice: 0,
      whatsapp: 0
    };

    recommendations.forEach(rec => {
      rec.recommendedActions.forEach((action: string) => {
        if (action.includes('email')) channelScores.email += rec.priority;
        if (action.includes('voice')) channelScores.voice += rec.priority;
        if (action.includes('whatsapp')) channelScores.whatsapp += rec.priority;
      });
    });

    return Object.entries(channelScores)
      .sort(([,a], [,b]) => b - a)
      .map(([channel]) => channel);
  }

  private generateTimeline(recommendations: any[]): any {
    const phases = {
      immediate: recommendations.filter(r => r.priority > 80).length,
      shortTerm: recommendations.filter(r => r.priority > 60 && r.priority <= 80).length,
      longTerm: recommendations.filter(r => r.priority <= 60).length
    };

    return {
      phases,
      estimatedDuration: {
        immediate: "1-2 hours",
        shortTerm: "1-3 days",
        longTerm: "1-2 weeks"
      }
    };
  }

  private calculateEffectiveness(recommendations: any[]): any {
    const avgConversion = recommendations.reduce((sum, r) => sum + r.estimatedConversionRate, 0) / recommendations.length;
    const totalExpectedConversions = recommendations.reduce((sum, r) => sum + r.estimatedConversionRate, 0);

    return {
      averageConversionRate: avgConversion,
      expectedConversions: Math.round(totalExpectedConversions),
      efficiency: avgConversion > 0.3 ? 'High' : avgConversion > 0.2 ? 'Medium' : 'Low'
    };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, candidateId, action } = await req.json();
    const engine = new DecisionEngine();

    let result;

    if (action === 'generate_strategy') {
      result = await engine.generateStrategy(campaignId);
    } else if (action === 'evaluate_candidate' && candidateId) {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (candidate && campaign) {
        const actions = await engine.evaluateCandidate(candidate, campaign);
        result = { candidateId, recommendedActions: actions };
      }
    } else {
      throw new Error('Invalid action or missing parameters');
    }

    // Log decision event
    await supabase
      .from('campaign_analytics')
      .insert({
        campaign_id: campaignId,
        candidate_id: candidateId,
        event_type: 'decision_made',
        channel: 'decision_engine',
        status: 'success',
        metadata: { action, result },
        timestamp: new Date().toISOString()
      });

    return new Response(JSON.stringify({
      success: true,
      result
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in decision-engine function:", error);
    
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