import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  name: string;
  email: string;
  message: string;
  type?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message, type = 'contact' }: EmailRequest = await req.json();

    console.log(`Email received:`, {
      name,
      email,
      message,
      type,
      destination: 'admitconnectAI@gmail.com'
    });

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "AdmitConnect AI <onboarding@resend.dev>",
      to: ["admitconnectAI@gmail.com"],
      replyTo: email,
      subject: type === 'demo_request' 
        ? `Demo Request from ${name}` 
        : `Contact Form Submission from ${name}`,
      html: `
        <h2>${type === 'demo_request' ? 'Demo Request' : 'Contact Form Submission'}</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Reply directly to this email to respond to ${name}</small></p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully to admitconnectAI@gmail.com'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);