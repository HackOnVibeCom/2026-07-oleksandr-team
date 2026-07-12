-- GrowthKit — AI director strategies
-- Stores the growth strategy the AI director picked for each app.
-- Run once in Supabase: SQL Editor → New query → Run.

create table if not exists public.strategies (
  app_key     text primary key,
  app_name    text,
  app_niche   text,
  launched    boolean,
  strategy    jsonb not null,           -- { mechanics: [...], reasoning: "..." }
  reasoning   text,
  updated_at  timestamptz not null default now()
);

-- Row Level Security:
-- The SDK (browser, anon key) may only READ strategies.
-- Writes are performed by the local director script using the service_role
-- key, which bypasses RLS — so no insert/update policy for anon is needed.
alter table public.strategies enable row level security;

create policy "anon can read strategies"
  on public.strategies for select to anon using (true);
