import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Agent-based MCP Server with specialized AI agents
class AgentBasedMCPServer {
  // Analyst Agent - specializes in data analysis and insights
  private async analystAgent(prompt: string): Promise<any> {
    if (!GEMINI_API_KEY) {
      return {
        insights: ["Analyst Agent unavailable - API key not configured"],
        recommendations: ["Configure GEMINI_API_KEY to activate analyst capabilities"]
      };
    }

    const agentPrompt = `You are the Analyst Agent, specializing in data analysis and performance insights.

${prompt}

Provide structured analysis with actionable insights and recommendations in JSON format:
{
  "insights": ["insight 1", "insight 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: agentPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 600,
            }
          })
        }
      );

      if (!response.ok) throw new Error(`Analyst Agent API error: ${response.status}`);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        insights: [text],
        recommendations: ["Continue monitoring campaign performance"]
      };
    } catch (error: any) {
      console.error('Analyst Agent error:', error);
      return {
        insights: ["Error generating analysis"],
        recommendations: ["Retry analysis or check configuration"]
      };
    }
  }

  // Strategist Agent - specializes in optimization and strategy
  private async strategistAgent(prompt: string): Promise<any> {
    if (!GEMINI_API_KEY) {
      return {
        strategies: ["Strategist Agent unavailable - API key not configured"],
        priorities: []
      };
    }

    const agentPrompt = `You are the Strategist Agent, specializing in campaign optimization and strategic planning.

${prompt}

Provide strategic recommendations in JSON format:
{
  "strategies": ["strategy 1", "strategy 2", ...],
  "priorities": ["priority 1", "priority 2", ...],
  "expectedImpact": "description of expected outcomes"
}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: agentPrompt }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 600,
            }
          })
        }
      );

      if (!response.ok) throw new Error(`Strategist Agent API error: ${response.status}`);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        strategies: [text],
        priorities: ["Implement recommended strategies"],
        expectedImpact: "Improved campaign performance"
      };
    } catch (error: any) {
      console.error('Strategist Agent error:', error);
      return {
        strategies: ["Error generating strategy"],
        priorities: [],
        expectedImpact: "Unknown"
      };
    }
  }

  // Predictor Agent - specializes in forecasting and predictions
  private async predictorAgent(prompt: string): Promise<any> {
    if (!GEMINI_API_KEY) {
      return {
        predictions: ["Predictor Agent unavailable - API key not configured"],
        confidence: 0
      };
    }

    const agentPrompt = `You are the Predictor Agent, specializing in forecasting outcomes and conversion predictions.

${prompt}

Provide predictions in JSON format:
{
  "predictions": ["prediction 1", "prediction 2", ...],
  "confidence": 0.75,
  "factors": ["factor 1", "factor 2", ...],
  "timeline": "expected timeframe"
}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: agentPrompt }] }],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 500,
            }
          })
        }
      );

      if (!response.ok) throw new Error(`Predictor Agent API error: ${response.status}`);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        predictions: [text],
        confidence: 0.5,
        factors: ["Historical data"],
        timeline: "Short-term"
      };
    } catch (error: any) {
      console.error('Predictor Agent error:', error);
      return {
        predictions: ["Unable to generate predictions"],
        confidence: 0,
        factors: [],
        timeline: "Unknown"
      };
    }
  }
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'tools/list':
        return this.listTools();
      case 'tools/call':
        return this.callTool(params.name, params.arguments);
      case 'resources/list':
        return this.listResources();
      case 'resources/read':
        return this.fetchResource(params.uri);
      case 'prompts/list':
        return this.listPrompts();
      case 'prompts/get':
        return this.getPrompt(params.name, params.arguments);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private async fetchResource(uri: string): Promise<any> {
    switch (uri) {
      case 'campaign://active':
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('*')
          .eq('status', 'active');
        return { content: campaigns };
      case 'candidates://all':
        const { data: candidates } = await supabase
          .from('candidates')
          .select('*');
        return { content: candidates };
      case 'analytics://recent':
        const { data: analytics } = await supabase
          .from('campaign_analytics')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        return { content: analytics };
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private listTools() {
    return {
      tools: [
        {
          name: "analyze_campaign_performance",
          description: "Uses Analyst Agent to analyze campaign performance metrics with AI-powered insights",
          inputSchema: {
            type: "object",
            properties: {
              campaignId: { type: "string", description: "Campaign ID to analyze" },
              timeframe: { type: "string", description: "Analysis timeframe (e.g., '30d', '7d')" }
            },
            required: ["campaignId"]
          }
        },
        {
          name: "optimize_candidate_targeting",
          description: "Uses Strategist Agent to optimize candidate targeting and segmentation strategies",
          inputSchema: {
            type: "object",
            properties: {
              campaignId: { type: "string", description: "Campaign ID" },
              criteria: { type: "object", description: "Optimization criteria" }
            },
            required: ["campaignId"]
          }
        },
        {
          name: "predict_conversion_rate",
          description: "Uses Predictor Agent to forecast conversion rates based on candidate data",
          inputSchema: {
            type: "object",
            properties: {
              candidateData: { type: "array", description: "Array of candidate profiles" },
              campaignType: { type: "string", description: "Type of campaign" }
            },
            required: ["candidateData", "campaignType"]
          }
        },
        {
          name: "generate_communication_strategy",
          description: "Uses multiple agents to generate personalized communication strategies",
          inputSchema: {
            type: "object",
            properties: {
              candidateProfile: { type: "object", description: "Candidate profile data" },
              campaignGoals: { type: "object", description: "Campaign objectives" }
            },
            required: ["candidateProfile", "campaignGoals"]
          }
        }
      ]
    };
  }

  private async callTool(name: string, args: any): Promise<any> {
    console.log(`Agent-based tool call: ${name}`, args);

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
    console.log(`Analyst Agent analyzing campaign ${campaignId}`);

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    const { data: candidates } = await supabase
      .from('candidates')
      .select('*')
      .eq('campaign_id', campaignId);

    const { data: analytics } = await supabase
      .from('campaign_analytics')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(100);

    const totalCandidates = candidates?.length || 0;
    const engaged = analytics?.filter(a => a.event_type === 'engagement').length || 0;
    const conversions = analytics?.filter(a => a.event_type === 'conversion').length || 0;

    const analysisPrompt = `Analyze this campaign performance:

Campaign: ${campaign?.name || 'Unknown'}
Type: ${campaign?.type || 'N/A'}
Total Candidates: ${totalCandidates}
Engaged: ${engaged}
Conversions: ${conversions}
Engagement Rate: ${totalCandidates > 0 ? ((engaged / totalCandidates) * 100).toFixed(2) : 0}%
Conversion Rate: ${totalCandidates > 0 ? ((conversions / totalCandidates) * 100).toFixed(2) : 0}%

Provide actionable insights and recommendations for improving campaign performance.`;

    const aiInsights = await this.analystAgent(analysisPrompt);

    return {
      campaignId,
      timeframe,
      metrics: {
        totalCandidates,
        engaged,
        conversions,
        engagementRate: totalCandidates > 0 ? (engaged / totalCandidates) : 0,
        conversionRate: totalCandidates > 0 ? (conversions / totalCandidates) : 0
      },
      ...aiInsights,
      analyzedBy: "Analyst Agent"
    };
  }

  private async optimizeCandidateTargeting(campaignId: string, criteria: any): Promise<any> {
    console.log(`Strategist Agent optimizing targeting for campaign ${campaignId}`);

    const { data: candidates } = await supabase
      .from('candidates')
      .select('*')
      .eq('campaign_id', campaignId);

    const { data: analytics } = await supabase
      .from('campaign_analytics')
      .select('*')
      .eq('campaign_id', campaignId);

    const optimizationPrompt = `Optimize candidate targeting for this campaign:

Total Candidates: ${candidates?.length || 0}
Current Criteria: ${JSON.stringify(criteria)}
Historical Performance: ${analytics?.length || 0} events tracked

Provide strategic recommendations for:
1. Audience segmentation
2. Targeting refinements
3. Priority groups to focus on
4. Expected impact of optimizations`;

    const strategy = await this.strategistAgent(optimizationPrompt);

    const segments = candidates?.reduce((acc: any, candidate: any) => {
      const key = candidate.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      campaignId,
      currentSegments: segments,
      ...strategy,
      optimizedBy: "Strategist Agent",
      timestamp: new Date().toISOString()
    };
  }

  private async predictConversionRate(candidateData: any[], campaignType: string): Promise<any> {
    console.log(`Predictor Agent forecasting conversion rates for ${candidateData.length} candidates`);

    const predictionPrompt = `Predict conversion rates for this campaign:

Campaign Type: ${campaignType}
Number of Candidates: ${candidateData.length}
Sample Data: ${JSON.stringify(candidateData.slice(0, 5))}

Provide:
1. Expected conversion rate with confidence level
2. Key factors influencing conversion
3. Timeline for expected results
4. Specific predictions for different segments`;

    const predictions = await this.predictorAgent(predictionPrompt);

    return {
      campaignType,
      candidateCount: candidateData.length,
      ...predictions,
      predictedBy: "Predictor Agent",
      generatedAt: new Date().toISOString()
    };
  }

  private async generateCommunicationStrategy(candidateProfile: any, campaignGoals: any): Promise<any> {
    console.log("Multi-agent communication strategy generation");

    // Use all three agents for comprehensive strategy
    const analysisPrompt = `Analyze this candidate profile for communication strategy:
Profile: ${JSON.stringify(candidateProfile)}
Goals: ${JSON.stringify(campaignGoals)}`;

    const [analysis, strategy, predictions] = await Promise.all([
      this.analystAgent(analysisPrompt),
      this.strategistAgent(`Create communication strategy for: ${JSON.stringify(candidateProfile)}`),
      this.predictorAgent(`Predict engagement for profile: ${JSON.stringify(candidateProfile)}`)
    ]);

    return {
      candidateId: candidateProfile.id,
      analysis,
      strategy,
      predictions,
      generatedBy: "Multi-Agent Crew (Analyst + Strategist + Predictor)",
      timestamp: new Date().toISOString()
    };
  }


  private listResources() {
    return {
      resources: [
        {
          uri: "campaign://active",
          name: "Active Campaigns",
          description: "List of all active campaigns",
          mimeType: "application/json"
        },
        {
          uri: "candidates://all",
          name: "All Candidates",
          description: "Complete candidate database",
          mimeType: "application/json"
        },
        {
          uri: "analytics://recent",
          name: "Recent Analytics",
          description: "Recent campaign analytics events",
          mimeType: "application/json"
        }
      ]
    };
  }
  private listPrompts() {
    return {
      prompts: [
        {
          name: "campaign_analysis",
          description: "Agent-powered campaign performance analysis",
          arguments: [
            { name: "campaignId", description: "Campaign to analyze", required: true }
          ]
        },
        {
          name: "optimization_strategy",
          description: "Agent-generated optimization strategy",
          arguments: [
            { name: "campaignId", description: "Campaign to optimize", required: true }
          ]
        }
      ]
    };
  }

  private async getPrompt(name: string, args: any): Promise<any> {
    switch (name) {
      case "campaign_analysis":
        return {
          prompt: `Analyze campaign ${args.campaignId} using multi-agent system`,
          agentsInvolved: ["Analyst Agent", "Strategist Agent"]
        };
      case "optimization_strategy":
        return {
          prompt: `Generate optimization strategy for campaign ${args.campaignId}`,
          agentsInvolved: ["Strategist Agent", "Predictor Agent"]
        };
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { method, params }: MCPRequest = await req.json();

    console.log(`Agent-based MCP request: ${method}`);

    const server = new AgentBasedMCPServer();
    const result = await server.handleRequest(method, params);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Agent-based MCP error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);