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
      console.log("Gemini API key not found, using mock response");
      return new Response(JSON.stringify({
        response: "I'm currently in demo mode. For full AI capabilities, please configure the Gemini API key in your Supabase edge function secrets. I can still help you with general information about college admissions and applications!"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build conversation context for Gemini
    const systemPrompt = `You are an AI college counselor and campaign management agent for AdmitConnect AI. You help with:

CORE FUNCTIONS:
- College admissions guidance and application strategies
- Campaign management and student outreach coordination
- Analytics and reporting on engagement metrics
- Managing email, voice, and WhatsApp campaigns

AGENT CAPABILITIES:
- Trigger email campaigns to student lists
- Initiate voice calls using Google TTS + Twilio
- Send WhatsApp messages to prospects
- Generate analytics reports on campaign performance
- Manage student data from CSV uploads

Guidelines:
- Be helpful, encouraging, and professional
- Provide actionable advice for college admissions
- When managing campaigns, confirm actions before execution
- Track and report on engagement metrics
- Support students' goals while optimizing outreach efficiency

Current conversation context: You're helping with both student guidance and campaign management.`;

    // Convert conversation history to Gemini format
    const conversationText = conversationHistory.slice(-8).map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const fullPrompt = `${systemPrompt}

Previous conversation:
${conversationText}

Current user message: ${message}

Please respond as the AI college counselor and campaign agent:`;

    console.log("Sending request to Gemini with message:", message);

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
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
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500,
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
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorData);
      
      return new Response(JSON.stringify({
        response: "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment, or feel free to contact our support team for immediate assistance."
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const data = await geminiResponse.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response. Please try again.";

    console.log("AI response generated successfully");

    return new Response(JSON.stringify({
      response: aiResponse
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in ai-chat function:", error);
    
    return new Response(JSON.stringify({
      response: "I'm experiencing some technical difficulties. Please try again in a moment."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);