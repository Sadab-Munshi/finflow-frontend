-- 005_user_events.sql
-- 2026-10-07 — Admin panel "user depth" (detail page + activity timeline)
--
-- user_events: low-volume account/security events per user, shown in the
-- Vertex user-detail "Activity" timeline. High-volume product events (page
-- views, feature clicks) stay in PostHog — they are NOT duplicated here.
--
-- Written by finflow-api with the service role. RLS enabled, no policies:
-- service-role only rows (they can contain IPs).

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,           -- signup | login | banned | unbanned | password_reset_forced | sessions_revoked | user_edited | user_deleted
  detail jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists user_events_user_created_idx
  on public.user_events (user_id, created_at desc);
create index if not exists user_events_type_idx on public.user_events (type);

alter table public.user_events enable row level security;
