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

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface MCPRequest {
  method: string;
  params: any;
}

interface ContextData {
  campaign: any;
  candidates: any[];
  analytics: any[];
  performance: any;
}

class MCPServer {
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'tools/list':
        return this.listTools();
      case 'tools/call':
        return this.callTool(params.name, params.arguments);
      case 'resources/list':
        return this.listResources();
      case 'resources/read':
        return this.readResource(params.uri);
      case 'prompts/list':
        return this.listPrompts();
      case 'prompts/get':
        return this.getPrompt(params.name, params.arguments);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private listTools() {
    return {
      tools: [
        {
          name: "analyze_campaign_performance",
          description: "Analyze campaign performance and provide insights",
          inputSchema: {
            type: "object",
            properties: {
              campaignId: { type: "string" },
              timeframe: { type: "string", enum: ["1d", "7d", "30d"] }
            },
            required: ["campaignId"]
          }
        },
        {
          name: "optimize_candidate_targeting",
          description: "Optimize candidate targeting based on historical data",
          inputSchema: {
            type: "object",
            properties: {
              campaignId: { type: "string" },
              criteria: { type: "object" }
            },
            required: ["campaignId"]
          }
        },
        {
          name: "predict_conversion_rate",
          description: "Predict conversion rates for candidates",
          inputSchema: {
            type: "object",
            properties: {
              candidateData: { type: "array" },
              campaignType: { type: "string" }
            },
            required: ["candidateData"]
          }
        },
        {
          name: "generate_communication_strategy",
          description: "Generate personalized communication strategy",
          inputSchema: {
            type: "object",
            properties: {
              candidateProfile: { type: "object" },
              campaignGoals: { type: "object" }
            },
            required: ["candidateProfile", "campaignGoals"]
          }
        }
      ]
    };
  }

  private async callTool(name: string, args: any): Promise<any> {
    switch (name) {
      case "analyze_campaign_performance":
        return this.analyzeCampaignPerformance(args.campaignId, args.timeframe);
      case "optimize_candidate_targeting":
        return this.optimizeCandidateTargeting(args.campaignId, args.criteria);
      case "predict_conversion_rate":
        return this.predictConversionRate(args.candidateData, args.campaignType);
      case "generate_communication_strategy":
        return this.generateCommunicationStrategy(args.candidateProfile, args.campaignGoals);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async analyzeCampaignPerformance(campaignId: string, timeframe: string = "30d"): Promise<any> {
    const days = timeframe === "1d" ? 1 : timeframe === "7d" ? 7 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get campaign data
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    // Get analytics data
    const { data: analytics } = await supabase
      .from('campaign_analytics')
      .select('*')
      .eq('campaign_id', campaignId)
      .gte('timestamp', startDate);

    // Get candidates data
    const { data: candidates } = await supabase
      .from('candidates')
      .select('*')
      .eq('campaign_id', campaignId);

    if (!campaign || !analytics || !candidates) {
      throw new Error('Campaign data not found');
    }

    const analysis = {
      campaignId,
      timeframe,
      metrics: {
        totalCandidates: candidates.length,
        emailsSent: analytics.filter(a => a.event_type === 'email_sent').length,
        callsMade: analytics.filter(a => a.event_type === 'voice_call_made').length,
        whatsappSent: analytics.filter(a => a.event_type === 'whatsapp_sent').length,
        responses: analytics.filter(a => a.event_type === 'response_received').length,
        conversions: candidates.filter(c => c.response_received).length
      },
      performance: {
        emailOpenRate: this.calculateRate(analytics, 'email_opened', 'email_sent'),
        callAnswerRate: this.calculateRate(analytics, 'call_answered', 'voice_call_made'),
        whatsappReadRate: this.calculateRate(analytics, 'whatsapp_read', 'whatsapp_sent'),
        overallConversionRate: candidates.filter(c => c.response_received).length / candidates.length
      },
      insights: [],
      recommendations: []
    };

    // Generate AI insights using Gemini
    const aiInsights = await this.generateAIInsights(analysis, campaign, candidates, analytics);
    analysis.insights = aiInsights.insights;
    analysis.recommendations = aiInsights.recommendations;

    return analysis;
  }

  private async optimizeCandidateTargeting(campaignId: string, criteria: any): Promise<any> {
    const { data: candidates } = await supabase
      .from('candidates')
      .select('*')
      .eq('campaign_id', campaignId);

    const { data: analytics } = await supabase
      .from('campaign_analytics')
      .select('*')
      .eq('campaign_id', campaignId);

    if (!candidates || !analytics) {
      throw new Error('Data not found');
    }

    // Analyze high-performing candidate segments
    const segments = this.identifyHighPerformingSegments(candidates, analytics);
    
    // Generate targeting recommendations
    const recommendations = await this.generateTargetingRecommendations(segments, criteria);

    return {
      campaignId,
      segments,
      recommendations,
      optimizedCriteria: recommendations.optimizedCriteria
    };
  }

  private async predictConversionRate(candidateData: any[], campaignType: string): Promise<any> {
    const predictions = candidateData.map(candidate => {
      let score = 0.15; // Base conversion rate

      // Scoring factors
      if (candidate.email) score += 0.1;
      if (candidate.phone) score += 0.08;
      if (candidate.course) score += 0.12;
      if (candidate.city) score += 0.05;

      // Campaign type adjustments
      if (campaignType === 'enrollment') score *= 1.2;
      if (campaignType === 'event') score *= 0.8;
      if (campaignType === 'information') score *= 0.6;

      return {
        candidateId: candidate.id,
        predictedConversionRate: Math.min(0.95, score),
        confidence: this.calculateConfidence(candidate),
        factors: this.getConversionFactors(candidate)
      };
    });

    return {
      predictions,
      averagePredictedRate: predictions.reduce((sum, p) => sum + p.predictedConversionRate, 0) / predictions.length,
      highPotentialCandidates: predictions.filter(p => p.predictedConversionRate > 0.4),
      recommendations: this.generatePredictionRecommendations(predictions)
    };
  }

  private async generateCommunicationStrategy(candidateProfile: any, campaignGoals: any): Promise<any> {
    const strategy = {
      candidateId: candidateProfile.id,
      personalizedApproach: this.generatePersonalizedApproach(candidateProfile),
      channelStrategy: this.determineOptimalChannels(candidateProfile),
      timing: this.optimizeTiming(candidateProfile),
      content: await this.generatePersonalizedContent(candidateProfile, campaignGoals),
      followUpSequence: this.createFollowUpSequence(candidateProfile)
    };

    return strategy;
  }

  private calculateRate(analytics: any[], successEvent: string, totalEvent: string): number {
    const success = analytics.filter(a => a.event_type === successEvent).length;
    const total = analytics.filter(a => a.event_type === totalEvent).length;
    return total > 0 ? success / total : 0;
  }

  private async generateAIInsights(analysis: any, campaign: any, candidates: any[], analytics: any[]): Promise<any> {
    if (!GEMINI_API_KEY) {
      return {
        insights: ["AI insights unavailable - Gemini API key not configured"],
        recommendations: ["Configure Gemini API key for AI-powered insights"]
      };
    }

    const prompt = `
    Analyze this campaign performance data and provide insights and recommendations:
    
    Campaign: ${campaign.name} (${campaign.type})
    Total Candidates: ${analysis.metrics.totalCandidates}
    Conversion Rate: ${(analysis.performance.overallConversionRate * 100).toFixed(2)}%
    Email Open Rate: ${(analysis.performance.emailOpenRate * 100).toFixed(2)}%
    Call Answer Rate: ${(analysis.performance.callAnswerRate * 100).toFixed(2)}%
    
    Please provide:
    1. Key insights about performance patterns
    2. Specific recommendations for improvement
    3. Potential issues or opportunities
    
    Respond in JSON format with "insights" and "recommendations" arrays.
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const aiResponse = data.candidates[0].content.parts[0].text;
      
      try {
        return JSON.parse(aiResponse);
      } catch {
        return {
          insights: [aiResponse.split('\n')[0] || "Performance analysis completed"],
          recommendations: [aiResponse.split('\n')[1] || "Continue monitoring campaign metrics"]
        };
      }
    } catch (error) {
      console.error('AI insights error:', error);
      return {
        insights: ["AI analysis temporarily unavailable"],
        recommendations: ["Review performance metrics manually"]
      };
    }
  }

  private identifyHighPerformingSegments(candidates: any[], analytics: any[]): any[] {
    const segments = {};
    
    // Group by different criteria
    ['course', 'city', 'status'].forEach(criteria => {
      candidates.forEach(candidate => {
        const key = `${criteria}:${candidate[criteria]}`;
        if (!segments[key]) {
          segments[key] = { criteria, value: candidate[criteria], candidates: [], conversions: 0 };
        }
        segments[key].candidates.push(candidate);
        if (candidate.response_received) segments[key].conversions++;
      });
    });

    // Calculate conversion rates and filter high-performing segments
    return Object.values(segments)
      .map((segment: any) => ({
        ...segment,
        conversionRate: segment.conversions / segment.candidates.length,
        size: segment.candidates.length
      }))
      .filter(segment => segment.conversionRate > 0.2 && segment.size >= 5)
      .sort((a, b) => b.conversionRate - a.conversionRate);
  }

  private async generateTargetingRecommendations(segments: any[], criteria: any): Promise<any> {
    return {
      topSegments: segments.slice(0, 3),
      optimizedCriteria: {
        primaryTargets: segments.filter(s => s.conversionRate > 0.4).map(s => ({ [s.criteria]: s.value })),
        secondaryTargets: segments.filter(s => s.conversionRate > 0.25 && s.conversionRate <= 0.4).map(s => ({ [s.criteria]: s.value })),
        avoid: segments.filter(s => s.conversionRate < 0.1).map(s => ({ [s.criteria]: s.value }))
      },
      estimatedImprovement: segments.length > 0 ? (segments[0].conversionRate - 0.15) * 100 : 0
    };
  }

  private calculateConfidence(candidate: any): number {
    let confidence = 0.5;
    
    if (candidate.email && candidate.phone) confidence += 0.2;
    if (candidate.course) confidence += 0.15;
    if (candidate.city) confidence += 0.1;
    if (candidate.status === 'active') confidence += 0.05;
    
    return Math.min(0.95, confidence);
  }

  private getConversionFactors(candidate: any): string[] {
    const factors = [];
    
    if (candidate.email) factors.push('Has email contact');
    if (candidate.phone) factors.push('Has phone contact');
    if (candidate.course) factors.push('Course interest specified');
    if (candidate.city) factors.push('Location data available');
    
    return factors;
  }

  private generatePredictionRecommendations(predictions: any[]): string[] {
    const recommendations = [];
    
    const highPotential = predictions.filter(p => p.predictedConversionRate > 0.4).length;
    const lowPotential = predictions.filter(p => p.predictedConversionRate < 0.2).length;
    
    if (highPotential > 0) {
      recommendations.push(`Focus on ${highPotential} high-potential candidates first`);
    }
    
    if (lowPotential > predictions.length * 0.3) {
      recommendations.push('Consider refining targeting criteria to reduce low-potential candidates');
    }
    
    recommendations.push('Implement personalized communication strategies for each segment');
    
    return recommendations;
  }

  private generatePersonalizedApproach(candidateProfile: any): any {
    return {
      tone: candidateProfile.course?.includes('engineering') ? 'technical' : 'friendly',
      focus: candidateProfile.course ? 'course-specific' : 'general',
      urgency: candidateProfile.status === 'hot_lead' ? 'high' : 'medium'
    };
  }

  private determineOptimalChannels(candidateProfile: any): string[] {
    const channels = [];
    
    if (candidateProfile.email) channels.push('email');
    if (candidateProfile.phone) channels.push('voice');
    if (candidateProfile.phone) channels.push('whatsapp');
    
    return channels;
  }

  private optimizeTiming(candidateProfile: any): any {
    return {
      bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
      bestHours: candidateProfile.course?.includes('working') ? ['18:00', '19:00', '20:00'] : ['10:00', '14:00', '16:00'],
      timezone: candidateProfile.city || 'IST'
    };
  }

  private async generatePersonalizedContent(candidateProfile: any, campaignGoals: any): Promise<any> {
    return {
      emailSubject: `Exciting ${candidateProfile.course || 'Educational'} Opportunities Await!`,
      emailBody: `Hi ${candidateProfile.name}, we have customized ${candidateProfile.course || 'course'} options for you...`,
      voiceScript: `Hello ${candidateProfile.name}, I'm calling about the ${candidateProfile.course || 'program'} you inquired about...`,
      whatsappMessage: `Hi ${candidateProfile.name}! Quick update on ${candidateProfile.course || 'your inquiry'}...`
    };
  }

  private createFollowUpSequence(candidateProfile: any): any[] {
    return [
      { day: 0, channel: 'email', action: 'initial_contact' },
      { day: 2, channel: 'voice', action: 'follow_up_call' },
      { day: 5, channel: 'whatsapp', action: 'reminder_message' },
      { day: 10, channel: 'email', action: 'final_offer' }
    ];
  }

  private listResources() {
    return {
      resources: [
        {
          uri: "campaigns://analytics",
          name: "Campaign Analytics",
          description: "Real-time campaign performance data"
        },
        {
          uri: "candidates://profiles",
          name: "Candidate Profiles",
          description: "Detailed candidate information and history"
        },
        {
          uri: "models://conversion",
          name: "Conversion Models",
          description: "Predictive models for conversion analysis"
        }
      ]
    };
  }

  private async readResource(uri: string): Promise<any> {
    // Implementation would fetch specific resource data
    return { uri, data: "Resource data would be fetched here" };
  }

  private listPrompts() {
    return {
      prompts: [
        {
          name: "analyze_performance",
          description: "Analyze campaign performance with AI insights"
        },
        {
          name: "optimize_targeting",
          description: "Optimize candidate targeting strategy"
        }
      ]
    };
  }

  private async getPrompt(name: string, args: any): Promise<any> {
    // Return prompt templates for different analysis types
    return { name, template: "Prompt template would be returned here", args };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { method, params }: MCPRequest = await req.json();
    const mcpServer = new MCPServer();
    
    const result = await mcpServer.handleRequest(method, params || {});

    return new Response(JSON.stringify({
      success: true,
      result
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in mcp-server function:", error);
    
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