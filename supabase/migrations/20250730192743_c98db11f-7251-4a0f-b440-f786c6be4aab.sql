-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'voice', 'both', 'email')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  template_whatsapp TEXT,
  template_voice TEXT,
  candidates_count INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  responses_received INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  course TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'responded', 'converted')),
  whatsapp_sent BOOLEAN DEFAULT false,
  voice_called BOOLEAN DEFAULT false,
  response_received BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_chat_sessions table
CREATE TABLE public.ai_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_chat_messages table
CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create schedule_demos table
CREATE TABLE public.schedule_demos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update profiles table with additional fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS college_name TEXT,
ADD COLUMN IF NOT EXISTS college_address TEXT,
ADD COLUMN IF NOT EXISTS college_website TEXT,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_alerts BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_demos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON public.campaigns FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create their own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own campaigns" ON public.campaigns FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create RLS policies for candidates
CREATE POLICY "Users can view candidates for their campaigns" ON public.candidates FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = candidates.campaign_id 
    AND campaigns.user_id::text = auth.uid()::text
  )
);
CREATE POLICY "Users can create candidates for their campaigns" ON public.candidates FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = candidates.campaign_id 
    AND campaigns.user_id::text = auth.uid()::text
  )
);
CREATE POLICY "Users can update candidates for their campaigns" ON public.candidates FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = candidates.campaign_id 
    AND campaigns.user_id::text = auth.uid()::text
  )
);
CREATE POLICY "Users can delete candidates for their campaigns" ON public.candidates FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = candidates.campaign_id 
    AND campaigns.user_id::text = auth.uid()::text
  )
);

-- Create RLS policies for AI chat sessions
CREATE POLICY "Users can view their own chat sessions" ON public.ai_chat_sessions FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create their own chat sessions" ON public.ai_chat_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own chat sessions" ON public.ai_chat_sessions FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own chat sessions" ON public.ai_chat_sessions FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create RLS policies for AI chat messages
CREATE POLICY "Users can view messages for their chat sessions" ON public.ai_chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.ai_chat_sessions 
    WHERE ai_chat_sessions.id = ai_chat_messages.session_id 
    AND ai_chat_sessions.user_id::text = auth.uid()::text
  )
);
CREATE POLICY "Users can create messages for their chat sessions" ON public.ai_chat_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_chat_sessions 
    WHERE ai_chat_sessions.id = ai_chat_messages.session_id 
    AND ai_chat_sessions.user_id::text = auth.uid()::text
  )
);

-- Create RLS policies for schedule demos
CREATE POLICY "Anyone can submit demo requests" ON public.schedule_demos FOR INSERT WITH CHECK (true);
CREATE POLICY "Only authenticated users can view demo requests" ON public.schedule_demos FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create triggers for updated_at columns
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_chat_sessions_updated_at BEFORE UPDATE ON public.ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_schedule_demos_updated_at BEFORE UPDATE ON public.schedule_demos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();