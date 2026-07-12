-- GrowthKit — extend clicks into a simple analytics event table.
-- Run once in Supabase: SQL Editor → New query → Run.
--
--   type    : 'install' (click-through on the install page)
--             'share'   (a growth mechanic was shown to a user)
--   variant : A/B test bucket for the card/copy ('A' or 'B')

alter table public.clicks add column if not exists type text not null default 'install';
alter table public.clicks add column if not exists variant text;
