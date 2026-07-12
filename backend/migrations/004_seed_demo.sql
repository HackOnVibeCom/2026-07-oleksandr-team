-- GrowthKit — seed ~2 weeks of demo analytics so the dashboard looks alive
-- even if the live demo hiccups on stage (see plan, pitfall #9).
--
-- Run ONCE in Supabase SQL Editor. Running again will add more rows (that's
-- fine, just inflates the numbers).
--
-- Shape of the seeded data (per app, per day):
--   variant A: 8 shares, 4 installs  -> 50% conversion (the winner)
--   variant B: 6 shares, 2 installs  -> 33% conversion
--   plus a mild upward trend toward today so the chart rises.

insert into public.clicks (app_key, type, variant, created_at)
select
  app_key,
  type,
  variant,
  now() - (d * interval '1 day') - (random() * interval '18 hours')
from (values ('demo-fittrack'), ('demo-sos')) as apps(app_key)
cross join (values ('share'), ('install')) as types(type)
cross join (values ('A'), ('B')) as variants(variant)
cross join generate_series(0, 13) as d
cross join lateral generate_series(
  1,
  (case
     when type = 'share'   and variant = 'A' then 8
     when type = 'share'   and variant = 'B' then 6
     when type = 'install' and variant = 'A' then 4
     when type = 'install' and variant = 'B' then 2
   end) + ((13 - d) / 4)   -- recent days get a few more events
) as g;
