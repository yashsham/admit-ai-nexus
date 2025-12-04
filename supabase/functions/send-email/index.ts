import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

    // Send email using Resend with basic input sanitization
    const safeName = String(name ?? '').trim().slice(0, 100);
    const safeEmail = String(email ?? '').trim().slice(0, 255);
    const safeMessage = String(message ?? '').trim().slice(0, 2000);

    const emailResponse = await resend.emails.send({
      from: "AdmitConnect AI <onboarding@resend.dev>",
      to: ["admitconnectai@gmail.com"],
      replyTo: safeEmail,
      subject: type === 'demo_request' 
        ? `Demo Request from ${safeName}` 
        : `Contact Form Submission from ${safeName}`,
      html: `
        <h2>${type === 'demo_request' ? 'Demo Request' : 'Contact Form Submission'}</h2>
        <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Reply directly to this email to respond to ${safeName}</small></p>
      `,
    });

    // Handle Resend response correctly
    if (emailResponse && (emailResponse as any).error) {
      const err = (emailResponse as any).error;
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ 
        success: false,
        error: err.message || 'Email service error' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully to admitconnectai@gmail.com'
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