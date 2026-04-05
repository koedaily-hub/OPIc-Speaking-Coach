# Analytics Phase 1.5 (DB + Server Setup)

This phase prepares Supabase for analytics storage and server-side access only.

## Required environment variables

Set these in local `.env.local` and deployment environment settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

> Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Do not use it in client components.

## Server helper

- File: `src/lib/supabase-server.ts`
- Purpose: reusable server-side Supabase client for future API routes.

## SQL migration

- File: `supabase/migrations/20260405_phase1_analytics.sql`
- Run in Supabase SQL Editor, or your migration workflow.

### Tables created

1. `feedback_events` – one row per generated AI feedback
2. `usage_events` – lightweight usage tracking events
3. `issue_reports` – bug / feature request / AI quality reports
4. `sessions` – anonymous session lifecycle counters/timestamps

## RLS note

For now, inserts are expected from server-side routes using the service role key.
Auth/RLS policy design can be added in a later phase.
