import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface EmailAgentRequest {
  campaignId: string;
  candidateIds?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, candidateIds }: EmailAgentRequest = await req.json();

    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, user_id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Get candidates for this campaign
    let candidatesQuery = supabase
      .from('candidates')
      .select('*')
      .eq('campaign_id', campaignId);

    if (candidateIds && candidateIds.length > 0) {
      candidatesQuery = candidatesQuery.in('id', candidateIds);
    }

    const { data: candidates, error: candidatesError } = await candidatesQuery;

    if (candidatesError) {
      throw new Error('Failed to fetch candidates');
    }

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No candidates found for this campaign'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get email template (you might want to fetch this from campaign data)
    const emailTemplate = campaign.template_email || `
      Hi {{name}},
      
      We're excited to share information about our {{course}} program.
      
      Our team would love to discuss how this program can help you achieve your goals.
      
      Best regards,
      Admissions Team
    `;

    const emailSubject = campaign.email_subject || `Exciting Opportunity: ${campaign.name}`;

    let sent = 0;
    let failed = 0;
    const results: any[] = [];

    // Send emails to each candidate
    for (const candidate of candidates) {
      try {
        // Skip candidates without email
        if (!candidate.email) {
          console.log(`Skipping candidate ${candidate.name} - no email provided`);
          failed++;
          continue;
        }

        // Replace placeholders in template
        const personalizedMessage = emailTemplate
          .replace(/\{\{name\}\}/g, candidate.name || 'there')
          .replace(/\{\{course\}\}/g, candidate.course || 'our program');

        // Send email using Resend
        const emailResponse = await resend.emails.send({
          from: "AdmitConnect AI <onboarding@resend.dev>",
          to: [candidate.email],
          subject: emailSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">AdmitConnect AI</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
                ${personalizedMessage.replace(/\n/g, '<br>')}
              </div>
              <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
                <p>This email was sent as part of the "${campaign.name}" campaign.</p>
              </div>
            </div>
          `,
        });

        if (emailResponse && !(emailResponse as any).error) {
          sent++;
          results.push({
            candidate_id: candidate.id,
            status: 'sent',
            email: candidate.email
          });

          // Log to analytics
          await supabase.from('campaign_analytics').insert({
            campaign_id: campaignId,
            event_type: 'email_sent',
            channel: 'email',
            status: 'success',
            metadata: {
              candidate_id: candidate.id,
              candidate_name: candidate.name,
              email: candidate.email,
              message_id: (emailResponse as any).id
            },
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error((emailResponse as any).error?.message || 'Email send failed');
        }

      } catch (error: any) {
        console.error(`Failed to send email to ${candidate.email}:`, error);
        failed++;
        results.push({
          candidate_id: candidate.id,
          status: 'failed',
          email: candidate.email,
          error: error.message
        });

        // Log failure to analytics
        await supabase.from('campaign_analytics').insert({
          campaign_id: campaignId,
          event_type: 'email_failed',
          channel: 'email',
          status: 'failed',
          metadata: {
            candidate_id: candidate.id,
            candidate_name: candidate.name,
            email: candidate.email,
            error: error.message
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Update campaign statistics
    await supabase
      .from('campaigns')
      .update({
        messages_sent: (campaign.messages_sent || 0) + sent,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    return new Response(JSON.stringify({
      success: true,
      sent,
      failed,
      total: candidates.length,
      results
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in email-agent function:", error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      sent: 0,
      failed: 0
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);