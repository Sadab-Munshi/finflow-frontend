-- Migration 009: user segments (PRD §5) + feature flags (PRD §8.4)
-- Both are service-role only; the API does all reads/writes.

create table if not exists public.user_segments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  definition  jsonb not null default '{}',  -- { criteria?: {...}, ids?: text[] }
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table if exists public.user_segments enable row level security;
create policy if not exists "user_segments_service_all" on public.user_segments
  for all to service_role using (true) with check (true);
create policy if not exists "user_segments_auth_none" on public.user_segments
  for select to authenticated using (false);

create table if not exists public.feature_flags (
  key          text primary key,
  name         text not null,
  description  text not null default '',
  enabled      boolean not null default false,
  environment  text not null default 'all'
               check (environment in ('all', 'production', 'staging', 'development')),
  rollout_pct  integer not null default 100 check (rollout_pct between 0 and 100),
  targeting    jsonb not null default '{}', -- { segment_id?: text, user_ids?: text[] }
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table if exists public.feature_flags enable row level security;
create policy if not exists "feature_flags_service_all" on public.feature_flags
  for all to service_role using (true) with check (true);
create policy if not exists "feature_flags_auth_none" on public.feature_flags
  for select to authenticated using (false);

-- Segment audiences on campaigns (set when audience = 'segment')
alter table if exists public.notification_campaigns
  add column if not exists segment_id   text,
  add column if not exists segment_name text;
