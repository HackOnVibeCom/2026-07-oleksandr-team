-- GrowthKit — click-through tracking
-- Records each visit to the install page (attribution for shared cards).
-- Run this once in the Supabase dashboard: SQL Editor → New query → Run.

create table if not exists public.clicks (
  id          bigint generated always as identity primary key,
  app_key     text not null,
  ref         text,
  created_at  timestamptz not null default now()
);

-- Speeds up per-app counting for the dashboard.
create index if not exists clicks_app_key_created_idx
  on public.clicks (app_key, created_at desc);

-- Row Level Security. This is intentionally public demo analytics:
-- the browser uses the anon (public) key, so we scope what it may do.
alter table public.clicks enable row level security;

-- Allow anonymous inserts (recording a click from the install page)...
create policy "anon can insert clicks"
  on public.clicks for insert to anon with check (true);

-- ...and anonymous reads (the dashboard counter).
create policy "anon can read clicks"
  on public.clicks for select to anon using (true);
