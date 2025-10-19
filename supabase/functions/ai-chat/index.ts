import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatRequest {
  message: string;
  conversationHistory?: Message[];
}

// Agent definitions with specific roles and capabilities
interface Agent {
  name: string;
  role: string;
  goal: string;
  backstory: string;
  tools: string[];
}

// CrewAI-inspired multi-agent system
class AgentCrew {
  private agents: Agent[];
  private geminiApiKey: string;

  constructor(apiKey: string) {
    this.geminiApiKey = apiKey;
    this.agents = [
      {
        name: "College Counselor Agent",
        role: "College Admissions Expert",
        goal: "Provide expert guidance on college applications, essay writing, and admissions strategies",
        backstory: "An experienced college counselor with 15+ years helping students get into top universities. Expert in application strategies, essay feedback, and extracurricular optimization.",
        tools: ["application_review", "essay_feedback", "university_research"]
      },
      {
        name: "Campaign Manager Agent",
        role: "Marketing Campaign Strategist",
        goal: "Design and execute effective student outreach campaigns across multiple channels",
        backstory: "A marketing strategist specializing in education sector with expertise in multi-channel campaigns, targeting, and conversion optimization.",
        tools: ["campaign_design", "audience_segmentation", "performance_tracking"]
      },
      {
        name: "Data Analyst Agent",
        role: "Analytics and Insights Specialist",
        goal: "Analyze campaign performance, student engagement metrics, and provide actionable insights",
        backstory: "A data scientist with deep expertise in education analytics, A/B testing, and predictive modeling for student success.",
        tools: ["data_analysis", "performance_metrics", "trend_prediction"]
      },
      {
        name: "Communications Agent",
        role: "Multi-Channel Communications Coordinator",
        goal: "Craft compelling messages and coordinate outreach across email, voice, and WhatsApp",
        backstory: "A communications expert skilled in persuasive messaging, personalization, and multi-channel coordination for maximum engagement.",
        tools: ["message_crafting", "channel_optimization", "engagement_tracking"]
      }
    ];
  }

  // Route user query to appropriate agent(s)
  private routeToAgents(message: string): Agent[] {
    const lowerMessage = message.toLowerCase();
    const activeAgents: Agent[] = [];

    // College admissions related
    if (lowerMessage.includes("college") || lowerMessage.includes("admission") || 
        lowerMessage.includes("application") || lowerMessage.includes("essay") ||
        lowerMessage.includes("university")) {
      activeAgents.push(this.agents[0]); // College Counselor
    }

    // Campaign related
    if (lowerMessage.includes("campaign") || lowerMessage.includes("outreach") ||
        lowerMessage.includes("marketing") || lowerMessage.includes("strategy")) {
      activeAgents.push(this.agents[1]); // Campaign Manager
    }

    // Analytics related
    if (lowerMessage.includes("analytic") || lowerMessage.includes("data") ||
        lowerMessage.includes("metric") || lowerMessage.includes("performance") ||
        lowerMessage.includes("report")) {
      activeAgents.push(this.agents[2]); // Data Analyst
    }

    // Communications related
    if (lowerMessage.includes("email") || lowerMessage.includes("message") ||
        lowerMessage.includes("whatsapp") || lowerMessage.includes("voice") ||
        lowerMessage.includes("call")) {
      activeAgents.push(this.agents[3]); // Communications Agent
    }

    // If no specific agents matched, use all agents for comprehensive response
    if (activeAgents.length === 0) {
      return this.agents;
    }

    return activeAgents;
  }

  // Execute task with agent collaboration
  async executeTask(message: string, conversationHistory: Message[]): Promise<string> {
    const activeAgents = this.routeToAgents(message);
    
    console.log(`Task routed to ${activeAgents.length} agent(s):`, activeAgents.map(a => a.name));

    // Build collaborative prompt with all active agents
    const agentContext = activeAgents.map(agent => `
**${agent.name}** (${agent.role}):
- Goal: ${agent.goal}
- Background: ${agent.backstory}
- Available Tools: ${agent.tools.join(", ")}
`).join("\n");

    const systemPrompt = `You are a multi-agent AI system for AdmitConnect AI with the following active agents working together:

${agentContext}

COLLABORATION PROTOCOL:
- Each agent contributes their expertise to provide a comprehensive response
- Agents can reference each other's insights and build on them
- Responses should be cohesive and naturally integrated, not siloed
- Prioritize actionable advice and specific recommendations
- When multiple agents are involved, synthesize their perspectives

CORE CAPABILITIES:
- College admissions guidance and application strategies
- Campaign management and student outreach coordination
- Analytics and reporting on engagement metrics
- Multi-channel communications (email, voice, WhatsApp)
- Data-driven decision making and optimization

RESPONSE STYLE:
- Professional yet encouraging
- Specific and actionable
- Data-informed when relevant
- Collaborative across agent perspectives`;

    // Convert conversation history
    const conversationText = conversationHistory.slice(-6).map(msg => 
      `${msg.role === 'user' ? 'User' : 'AI Crew'}: ${msg.content}`
    ).join('\n');

    const fullPrompt = `${systemPrompt}

Previous conversation:
${conversationText}

Current user message: ${message}

Respond as the AI agent crew, with each relevant agent contributing their expertise:`;

    console.log("Executing task with agent collaboration");

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-latest:generateContent?key=${this.geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: fullPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 800,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Gemini API error:", response.status, errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        "I apologize, but I couldn't generate a response. Please try again.";

      console.log("Agent crew task completed successfully");
      return aiResponse;

    } catch (error: any) {
      console.error("Error in agent execution:", error);
      throw error;
    }
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] }: ChatRequest = await req.json();

    // Check if Gemini API key is available
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.log("Gemini API key not found, agent crew unavailable");
      return new Response(JSON.stringify({
        response: "🤖 Multi-Agent System Status: Currently in demo mode. To activate the full AI agent crew (College Counselor, Campaign Manager, Data Analyst, and Communications agents), please configure the GEMINI_API_KEY. I can still provide general guidance!"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize agent crew
    const crew = new AgentCrew(geminiApiKey);

    // Execute task with agent collaboration
    const response = await crew.executeTask(message, conversationHistory);

    return new Response(JSON.stringify({
      response: response
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in ai-chat function:", error);
    
    return new Response(JSON.stringify({
      response: "The agent crew is experiencing technical difficulties. Please try again in a moment."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
