import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.13";

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

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPass) {
      throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables");
    }

    // Create a transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    // Sanitize inputs
    const safeName = String(name ?? '').trim().slice(0, 100);
    const safeEmail = String(email ?? '').trim().slice(0, 255);
    const safeMessage = String(message ?? '').trim().slice(0, 2000);

    const subject = type === 'demo_request'
      ? `Demo Request from ${safeName}`
      : `Contact Form Submission from ${safeName}`;

    const htmlContent = `
      <h2>${type === 'demo_request' ? 'Demo Request' : 'Contact Form Submission'}</h2>
      <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
      <p><strong>Message:</strong></p>
      <p>${safeMessage.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><small>Reply directly to this email to respond to ${safeName}</small></p>
    `;

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"AdmitConnect AI" <${gmailUser}>`, // sender address
      to: "admitconnectai@gmail.com", // list of receivers
      replyTo: safeEmail, // reply to the user's email
      subject: subject, // Subject line
      html: htmlContent, // html body
    });

    console.log("Message sent: %s", info.messageId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully via Gmail SMTP'
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
        error: error.message || "Internal Server Error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);