import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { Client } from "langsmith";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

// Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  title: string;
  url: string;
  content: string;
}

export interface ChatResponse {
  content: string;
  sources?: ChatSource[];
}

export type ChatContext = 'general' | 'dashboard' | 'counselor';

// Configuration
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const TAVILY_API_KEY = import.meta.env.VITE_TAVILY_API_KEY;
const TAVILY_API_URL = 'https://api.tavily.com/search';

// LangSmith Configuration
const LANGCHAIN_TRACING_V2 = import.meta.env.VITE_LANGCHAIN_TRACING_V2 === 'true';
const LANGCHAIN_API_KEY = import.meta.env.VITE_LANGCHAIN_API_KEY;
const LANGCHAIN_PROJECT = import.meta.env.VITE_LANGCHAIN_PROJECT;

// System Prompts
const GENERAL_SYSTEM_PROMPT = `You are the AdmitConnect AI Assistant, designed to help users understand and navigate the AdmitConnect platform.

About AdmitConnect AI:
AdmitConnect AI is a college admission campaign management platform that helps educational institutions execute multi-channel outreach campaigns through WhatsApp, Voice Calls, and Email using AI-powered automation.

Core capabilities include AI-powered campaign automation, real-time analytics for tracking engagement and response rates, multi-channel communication across Email, Voice, and WhatsApp, candidate management tools, 24/7 AI counseling agents, and predictive intelligence for campaign optimization.

The platform was developed by Yash Sharma, a Generative AI Engineer specializing in scalable AI solutions for educational technology.

Your role:
Provide clear, accurate information about the platform's features and capabilities. Offer professional guidance on college admission trends and best practices. Use real-time web search when needed for current information. Help users navigate the platform and understand how to use its features effectively.

Communication style:
Use clear, professional Markdown formatting for EVERY response.
- **Bold Headers**: Use bold text for key topics or section titles.
- **Lists**: ALWAYS use bullet points or numbered lists for steps, items, or features.
- **Paragraphs**: Keep paragraphs short (2-3 sentences) with clear line breaks between them.
- **No Blocks**: Avoid long walls of text. Break information down visually.
- **Tone**: Natural, conversational (like ChatGPT) but structured professionally.`;

const DASHBOARD_SYSTEM_PROMPT = `You are the AdmitConnect Campaign Expert, a specialized assistant for users working in the AdmitConnect Dashboard.

About the platform:
AdmitConnect AI, developed by Yash Sharma (Generative AI Engineer), is a comprehensive campaign management platform for college admissions. It enables educational institutions to streamline student outreach and enrollment through AI-driven automation.

Platform features:
The Campaign Creation Suite allows users to set up WhatsApp campaigns with automated personalized messaging, Voice Call campaigns with AI-powered interactions, and Email campaigns with professional sequences and tracking.

The Candidate Management System supports bulk uploads via CSV/Excel, intelligent segmentation and filtering, comprehensive candidate profiles, and engagement history tracking.

Analytics and Reporting provides real-time campaign performance metrics, response rate analysis, channel effectiveness comparisons, and ROI tracking with optimization insights.

The AI Agent Ecosystem includes a Counseling Crew for 24/7 automated student support, a Campaign Orchestrator for intelligent multi-channel coordination, a Decision Engine for smart campaign strategy recommendations, and a Content Generator for AI-powered message and script creation.

Automation and Intelligence features cover smart scheduling and timing optimization, predictive analytics for student engagement, automated follow-up sequences, and performance-based campaign adjustments.

Your expertise:
You understand campaign strategy development, multi-channel marketing for educational institutions, data-driven decision making for student recruitment, AI-powered automation workflows, and candidate engagement best practices.

How to help users:
For campaign creation, guide users through defining their target audience, recommend the optimal channel mix based on their goals, suggest effective messaging strategies, and help configure timing and frequency.

For analytics, explain what the metrics mean, identify areas for improvement, provide context by benchmarking against industry standards, and recommend specific optimization strategies.

For feature navigation, give clear step-by-step instructions on how to find and use dashboard features, configure settings, set up integrations, and apply best practices.

For strategy consultation, offer professional recommendations on campaign planning and execution, channel selection based on demographics, content personalization techniques, and engagement optimization.

Communication style:
Use clear, professional Markdown formatting for EVERY response.
- **Bold Headers**: Use bold text for key topics or section titles.
- **Lists**: ALWAYS use bullet points or numbered lists for steps, items, or features.
- **Paragraphs**: Keep paragraphs short (2-3 sentences) with clear line breaks between them.
- **No Blocks**: Avoid long walls of text. Break information down visually.
- **Tone**: Consultative and actionable.`;

const COUNSELOR_SYSTEM_PROMPT = `You are the AdmitConnect AI College Counselor, a strict and focused assistant dedicated ONLY to college admissions, student counseling, and educational guidance.

Instructions:
1. STRICT DOMAIN RESTRICTION: You must ONLY answer questions related to college admissions, university information, applications, scholarships, exams, student life, and academic guidance.
2. GUARDRAILS: If a user asks a question unrelated to education or admissions (e.g., sports, politics, entertainment, general chit-chat unrelated to college), you must POLITELY REFUSE to answer.
   - Example valid refusal: "I apologize, but I am specialized only in college admissions and educational counseling. I cannot assist with that topic."
3. SOURCE-BASED ANSWERS: You will be provided with information from web searches. You must use this information to answer user questions accurately. Cite your sources using [1], [2] notation.
4. TONE: Professional, encouraging, empathetic, and formal yet accessible. You are guiding students through a stressful process.
5. FORMATTING: STRICTLY use professional Markdown.
   - Use **Bold** for major points.
   - Use bullet points for lists.
   - Separate thoughts with new lines.
   - Make it easy to read on mobile devices.

You are NOT a general purpose AI. You are a specialized College Counselor. Do not break character. Do not answer questions outside your scope.`;

export class ChatService {
  private context: ChatContext;
  private model: ChatGroq | null = null;
  private tracer: LangChainTracer | undefined;
  private isAvailable: boolean = false;

  constructor(context: ChatContext = 'general') {
    this.context = context;

    if (!GROQ_API_KEY) {
      console.warn('Groq API key is missing - chat service will be unavailable');
      return;
    }

    try {
      this.model = new ChatGroq({
        apiKey: GROQ_API_KEY,
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        maxTokens: 1024,
      });
      this.isAvailable = true;

      // Initialize LangSmith Tracer
      if (LANGCHAIN_TRACING_V2 && LANGCHAIN_API_KEY) {
        try {
          const client = new Client({
            apiUrl: import.meta.env.VITE_LANGCHAIN_ENDPOINT,
            apiKey: LANGCHAIN_API_KEY,
          });

          this.tracer = new LangChainTracer({
            projectName: LANGCHAIN_PROJECT || "default",
            client,
          });
        } catch (e) {
          console.warn("Failed to initialize LangSmith tracer", e);
        }
      }
    } catch (error) {
      console.error('Failed to initialize ChatService:', error);
      this.isAvailable = false;
    }
  }

  public checkAvailability(): boolean {
    return this.isAvailable;
  }

  private async searchTavily(query: string): Promise<ChatSource[]> {
    if (!TAVILY_API_KEY) {
      console.warn('Tavily API key is missing');
      return [];
    }

    try {
      const response = await fetch(TAVILY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          search_depth: 'basic',
          include_answer: true,
          max_results: 3,
        }),
      });

      if (!response.ok) {
        throw new Error('Tavily search failed');
      }

      const data = await response.json();
      return data.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        content: result.content,
      }));
    } catch (error) {
      console.error('Error searching Tavily:', error);
      return [];
    }
  }

  public async generateResponse(userMessage: string, history: ChatMessage[] = [], dashboardContext?: any): Promise<ChatResponse> {
    if (!this.model || !this.isAvailable) {
      return {
        content: "I'm sorry, the AI chat service is currently unavailable. Please check the API configuration.",
        sources: []
      };
    }

    try {
      let sources: ChatSource[] = [];
      let contextContent = '';

      // 1. Determine if we need external search (RAG)
      // For counselor, we ALWAYS search if the query seems informational, to ensure accuracy.
      // We can also add restrictions here if a specific site is needed (site:example.edu)
      if (
        this.context === 'counselor' ||
        (userMessage.length > 10 && (this.context === 'general' || userMessage.toLowerCase().includes('search') || userMessage.toLowerCase().includes('news')))
      ) {
        sources = await this.searchTavily(userMessage);
      }

      // 2. Construct System Prompt and Context
      let systemPrompt = GENERAL_SYSTEM_PROMPT;
      if (this.context === 'dashboard') systemPrompt = DASHBOARD_SYSTEM_PROMPT;
      if (this.context === 'counselor') systemPrompt = COUNSELOR_SYSTEM_PROMPT;

      // Inject Dashboard Context if available
      if (dashboardContext && this.context === 'dashboard') {
        const statsSummary = dashboardContext.stats ?
          `\nCurrent Dashboard Stats:\n- Total Campaigns: ${dashboardContext.stats.totalCampaigns}\n- Messages Sent: ${dashboardContext.stats.messagesSent}\n- Response Rate: ${dashboardContext.stats.responseRate}%` : '';

        const campaignsSummary = dashboardContext.campaigns && dashboardContext.campaigns.length > 0 ?
          `\nRecent Campaigns:\n${dashboardContext.campaigns.slice(0, 5).map((c: any) => `- ${c.name} (${c.status}): ${c.candidates_count || 0} candidates`).join('\n')}` : '';

        systemPrompt += `\n\nREAL-TIME CONTEXT:\n${statsSummary}\n${campaignsSummary}\n\nUse this real-time data to answer user questions about their specific campaigns.`;
      }

      if (sources.length > 0) {
        contextContent = `\n\nHere is some relevant information found from the web:\n${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.content}`).join('\n')}\n\nUse this information to answer the user's question if relevant. Cite sources using [1], [2] notation.`;
      }

      // 3. Prepare LangChain Messages
      const messages = [
        new SystemMessage(systemPrompt + contextContent),
        ...history.map(msg => {
          if (msg.role === 'user') return new HumanMessage(msg.content);
          if (msg.role === 'assistant') return new AIMessage(msg.content);
          return new SystemMessage(msg.content);
        }),
        new HumanMessage(userMessage)
      ];

      // 4. Call LLM with LangChain
      const callbacks = this.tracer ? [this.tracer] : [];

      const response = await this.model.invoke(messages, {
        callbacks,
        metadata: {
          context: this.context
        },
        tags: ["admit-connect-ai", this.context]
      });

      const content = response.content as string;

      return {
        content,
        sources
      };

    } catch (error) {
      console.error('ChatService error:', error);
      return {
        content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
        sources: []
      };
    }
  }
}
