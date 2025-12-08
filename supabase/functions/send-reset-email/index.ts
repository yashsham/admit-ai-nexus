// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import nodemailer from "npm:nodemailer@6.9.13";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface ResetRequest {
    email: string;
    redirectTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { email, redirectTo }: ResetRequest = await req.json();

        if (!email) {
            throw new Error("Email is required");
        }

        // Initialize Supabase Admin Client
        // @ts-ignore
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        // @ts-ignore
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Generate Recovery Link using Admin API
        const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: email,
            options: {
                redirectTo: redirectTo,
            }
        });

        if (linkError) {
            console.error("Error generating link:", linkError);
            throw linkError;
        }

        const actionLink = data.properties?.action_link;
        if (!actionLink || !redirectTo) {
            throw new Error("Could not generate link or missing redirect URL");
        }

        console.log("Generated action_link:", actionLink);

        // Extract token from action_link
        // action_link format: https://site.url?token=...&type=recovery...
        const linkUrl = new URL(actionLink);
        const token = linkUrl.searchParams.get("token");
        const tokenHash = linkUrl.searchParams.get("token_hash");

        // Use token_hash if available (PKCE), otherwise token
        const finalToken = tokenHash || token;
        const tokenTypeParam = tokenHash ? "token_hash" : "token";

        if (!finalToken) {
            throw new Error("Could not extract token from action_link");
        }

        // Construct Manual Verification Link
        const separator = redirectTo.includes('?') ? '&' : '?';
        const recoveryLink = `${redirectTo}${separator}${tokenTypeParam}=${encodeURIComponent(finalToken)}&type=recovery&email=${encodeURIComponent(email)}`;

        // Setup Nodemailer (using existing Gmail config)
        // @ts-ignore
        const gmailUser = Deno.env.get("GMAIL_USER");
        // @ts-ignore
        const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");

        if (!gmailUser || !gmailPass) {
            throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables");
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
        });

        // Send Email
        const htmlContent = `
      <h2>Reset Your Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for your AdmitConnect AI account.</p>
      <p>Click the link below to set a new password:</p>
      <p><a href="${recoveryLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>If you didn't ask to reset your password, you can ignore this email.</p>
      <br>
      <p><small>This link will expire in 1 hour.</small></p>
    `;

        await transporter.sendMail({
            from: `"AdmitConnect AI" <${gmailUser}>`,
            to: email,
            subject: "Reset Your Password - AdmitConnect AI",
            html: htmlContent,
        });

        console.log(`Password reset email sent to ${email}`);

        return new Response(
            JSON.stringify({ success: true, message: "Password reset email sent" }),
            {
                headers: { "Content-Type": "application/json", ...corsHeaders },
                status: 200,
            }
        );
    } catch (error: any) {
        console.error("Error in send-reset-email:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { "Content-Type": "application/json", ...corsHeaders },
                status: 400,
            }
        );
    }
};

serve(handler);
