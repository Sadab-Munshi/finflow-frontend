-- Migration 010: signup waitlist (captured when registrations are closed/capped)
-- Inserts only via service role (finflow-api /api/auth/waitlist-join) — no public policies.

create table if not exists public.signup_waitlist (
  id uuid primary key default uuid_generate_v4(),
  -- stored lower-cased at insert time; uniqueness enforced here
  email text not null unique,
  reason text not null default 'closed' check (reason in ('closed', 'invite_only', 'capacity')),
  created_at timestamptz not null default now()
);

comment on table public.signup_waitlist is 'Emails captured on the closed-signup card so interested users can be notified when registrations reopen.';

create index if not exists signup_waitlist_created_at_idx on public.signup_waitlist (created_at desc);

alter table public.signup_waitlist enable row level security;
-- No RLS policies: every read/write happens server-side through the service-role key.
