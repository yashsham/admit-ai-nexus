create table public.automation_rules (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  trigger text not null,
  channels text[] not null,
  delay integer not null default 0,
  template text not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint automation_rules_pkey primary key (id)
);

alter table public.automation_rules enable row level security;

create policy "Users can view their own automation rules"
on public.automation_rules for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own automation rules"
on public.automation_rules for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own automation rules"
on public.automation_rules for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own automation rules"
on public.automation_rules for delete
to authenticated
using (auth.uid() = user_id);
