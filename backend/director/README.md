# AI Director (local script)

Decides, per app, which growth mechanics to activate — by asking OpenAI — and
stores the result in Supabase (`strategies` table). Runs server-side; secrets
stay in the repo-root `.env` and never reach the browser.

## Setup (once)
1. In Supabase → SQL Editor, run `backend/migrations/002_strategies.sql`.
2. Copy `.env.example` (repo root) to `.env` and fill in:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → service_role, **secret**)

## Run
From the repo root:
```
node backend/director/director.mjs
```
It processes every app in `apps.json`, prints the chosen mechanics, and upserts
each strategy into Supabase. Re-run any time to refresh strategies (cached in DB;
we do NOT call OpenAI on every page load).

The SDK reads these strategies and renders the assigned mechanics (Step 9).
