-- Enable the pg_net extension to make HTTP requests
create extension if not exists "pg_net";

-- Function to invoke campaign orchestrator
create or replace function public.invoke_campaign_orchestrator()
returns trigger as $$
declare
  project_url text := 'https://YOUR_PROJECT_REF.supabase.co'; -- User needs to replace this or we use a relative path if supported (pg_net usually needs absolute)
  anon_key text := 'YOUR_ANON_KEY'; -- User needs to replace this
begin
  -- Only trigger if campaign is active (status = 'active')
  -- We need to check the campaign status first
  if exists (
    select 1 from public.campaigns 
    where id = new.campaign_id 
    and status = 'active'
  ) then
    -- Call the edge function
    perform net.http_post(
      url := project_url || '/functions/v1/campaign-orchestrator',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'campaignId', new.campaign_id,
        'candidateIds', jsonb_build_array(new.id)
      )
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for campaign orchestrator
drop trigger if exists on_candidate_created on public.candidates;
create trigger on_candidate_created
  after insert on public.candidates
  for each row
  execute function public.invoke_campaign_orchestrator();

-- Function to invoke send-email for contact submissions
create or replace function public.invoke_contact_email()
returns trigger as $$
declare
  project_url text := 'https://YOUR_PROJECT_REF.supabase.co';
  anon_key text := 'YOUR_ANON_KEY';
begin
  perform net.http_post(
    url := project_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'name', new.name,
      'email', new.email,
      'message', new.message,
      'type', 'contact'
    )
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for contact submissions
drop trigger if exists on_contact_submission on public.contact_submissions;
create trigger on_contact_submission
  after insert on public.contact_submissions
  for each row
  execute function public.invoke_contact_email();
