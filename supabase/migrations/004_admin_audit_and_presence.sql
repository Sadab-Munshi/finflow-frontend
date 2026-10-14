-- 004_admin_audit_and_presence.sql
-- 2026-10-07
--
-- 1) admin_audit — every privileged action taken from the Vertex admin panel
--    (ban/unban, notification sends, signup-cap changes, test-notification
--    clears) with the admin's id, source IP and a JSON detail payload.
--    Written by finflow-api with the service role; read by GET
--    /api/admin/audit-log. RLS enabled, NO policies → service-role only,
--    which is exactly what we want for an audit log.
--
-- 2) user_heartbeat RLS policies — the FinFlow client historically upserted
--    its own heartbeat row with the anon key, but no policies existed, so
--    every write was silently rejected and the admin panel's "Online now"
--    stayed 0. The app now primarily heartbeats through the API (service
--    role); these policies are the belt-and-suspenders fallback so a direct
--    client upsert also works.

create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_at_idx
  on public.admin_audit (created_at desc);

alter table public.admin_audit enable row level security;
-- No RLS policies on admin_audit: only the service role (which bypasses RLS)
-- can read or write it.

-- ── user_heartbeat self-service policies ──
-- (idempotent: drop first in case a partial/old policy exists)

drop policy if exists "user_heartbeat select own" on public.user_heartbeat;
drop policy if exists "user_heartbeat insert own" on public.user_heartbeat;
drop policy if exists "user_heartbeat update own" on public.user_heartbeat;

alter table public.user_heartbeat enable row level security;

create policy "user_heartbeat select own"
  on public.user_heartbeat for select
  using (auth.uid() = user_id);

create policy "user_heartbeat insert own"
  on public.user_heartbeat for insert
  with check (auth.uid() = user_id);

create policy "user_heartbeat update own"
  on public.user_heartbeat for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
