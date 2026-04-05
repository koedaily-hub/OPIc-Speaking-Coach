-- Phase 1 analytics foundation
-- Safe to run in Supabase SQL editor or migration pipeline

create extension if not exists pgcrypto;

create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null,
  user_id uuid null,
  word text not null,
  topic text not null,
  target text not null,
  transcript text not null,
  feedback_output jsonb not null,
  helpful boolean null,
  helpful_reason text null
);

create index if not exists idx_feedback_events_created_at on public.feedback_events (created_at desc);
create index if not exists idx_feedback_events_session_id on public.feedback_events (session_id);
create index if not exists idx_feedback_events_helpful on public.feedback_events (helpful);
create index if not exists idx_feedback_events_topic_target on public.feedback_events (topic, target);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null,
  user_id uuid null,
  event_name text not null,
  word text null,
  topic text null,
  target text null,
  metadata jsonb null
);

create index if not exists idx_usage_events_created_at on public.usage_events (created_at desc);
create index if not exists idx_usage_events_session_id on public.usage_events (session_id);
create index if not exists idx_usage_events_event_name on public.usage_events (event_name);
create index if not exists idx_usage_events_topic_target on public.usage_events (topic, target);

create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null,
  user_id uuid null,
  type text not null,
  message text not null,
  page text null,
  context jsonb null,
  email text null,
  constraint issue_reports_type_check check (type in ('bug', 'feature_request', 'ai_quality'))
);

create index if not exists idx_issue_reports_created_at on public.issue_reports (created_at desc);
create index if not exists idx_issue_reports_session_id on public.issue_reports (session_id);
create index if not exists idx_issue_reports_type on public.issue_reports (type);

create table if not exists public.sessions (
  session_id text primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  record_count int not null default 0,
  feedback_count int not null default 0
);

create index if not exists idx_sessions_last_seen_at on public.sessions (last_seen_at desc);
