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

    // Check if OpenAI API key is available
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.log("OpenAI API key not found, using mock response");
      return new Response(JSON.stringify({
        response: "I'm currently in demo mode. For full AI capabilities, please configure the OpenAI API key in your Supabase edge function secrets. I can still help you with general information about college admissions and applications!"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build conversation context
    const systemPrompt = `You are an AI college counselor for AdmitConnect AI. You help students and families with:

- College admissions guidance
- Application strategies
- Campus information and resources
- Academic planning and course selection
- Financial aid and scholarship advice
- Career guidance related to college majors
- Test preparation strategies (SAT, ACT, etc.)

Guidelines:
- Be helpful, encouraging, and professional
- Provide accurate, up-to-date information about college admissions
- If you don't know something specific, acknowledge it and suggest reliable resources
- Keep responses concise but informative
- Focus on actionable advice
- Be supportive of students' goals and circumstances

Current conversation context: You're helping a student or family member with their college journey.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-8).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log("Sending request to OpenAI with message:", message);

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error("OpenAI API error:", openaiResponse.status, errorData);
      
      return new Response(JSON.stringify({
        response: "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment, or feel free to contact our support team for immediate assistance."
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const data = await openaiResponse.json();
    const aiResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

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