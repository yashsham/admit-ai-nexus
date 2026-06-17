-- Migration: Add Subscriptions and Usage Logs
-- Run this in Supabase SQL Editor

-- 1. Create Subscriptions Table
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null, -- Mapping to Auth ID or custom ID
  plan_id text not null default 'starter', -- 'starter', 'professional', 'enterprise'
  status text not null default 'active',
  current_period_start timestamptz default now(),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookup
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);

-- 2. Create Usage Logs Table (Granular)
create table if not exists public.usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  feature_name text not null, -- 'whatsapp_msg', 'voice_call', 'campaign_created'
  count int default 1,
  period_key text not null, -- format: 'YYYY-MM' to easily sum monthly usage
  created_at timestamptz default now()
);

-- Index for aggregation
create index if not exists idx_usage_user_period on public.usage_logs(user_id, period_key);

-- 3. Insert or Update Function helper (Optional, can be done in code)
-- But let's keep it simple and handle logic in Python.
