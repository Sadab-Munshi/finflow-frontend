-- 007_notification_campaigns.sql
-- 2026-10-07 — Admin panel "Notifications 2.0" (PRD §6)
--
-- notification_templates: reusable send presets (welcome, maintenance, …)
-- notification_campaigns: every send/schedule (audience, channels, stats)
-- notifications.campaign_id: links per-user in-app rows back to their
-- campaign, which makes "opened" tracking free — the FinFlow app already
-- flips notifications.read to true when a user opens one.
--
-- All three touched by finflow-api with the service role only.

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'system',
  title text not null,
  message text not null,
  icon text,
  link text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  template_id uuid,
  title text not null,
  message text not null,
  type text not null default 'system',
  icon text,
  link text,
  channels jsonb not null default '{"in_app": true, "push": false, "email": false}',
  audience text not null default 'all',      -- all | specific
  user_ids jsonb not null default '[]',
  status text not null default 'sent',       -- scheduled | sent | cancelled
  scheduled_for timestamptz,
  created_by uuid,
  created_by_email text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  stats jsonb not null default '{}'
);

create index if not exists notification_campaigns_status_idx
  on public.notification_campaigns (status, scheduled_for);

alter table public.notifications add column if not exists campaign_id uuid;
create index if not exists notifications_campaign_idx
  on public.notifications (campaign_id) where campaign_id is not null;

alter table public.notification_templates enable row level security;
alter table public.notification_campaigns enable row level security;
-- No policies: service-role only (admin panel data).
