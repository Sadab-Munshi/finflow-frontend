-- 008_ai_daily_usage.sql
-- 2026-10-07 — Controls 2.0 (PRD §8.2): per-user DAILY AI cap
--
-- ai_usage is keyed by month; daily caps need day granularity, so a small
-- companion table. Rows roll over harmlessly (old days simply stop being
-- read); an occasional manual prune keeps it tiny:
--   delete from public.ai_usage_daily where day < current_date - 40;

create table if not exists public.ai_usage_daily (
  user_id uuid not null,
  day date not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.ai_usage_daily enable row level security;
-- Service-role only: written by finflow-api during AI request gating.
