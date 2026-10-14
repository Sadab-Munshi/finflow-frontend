-- Migration 011: invite tracking on the signup waitlist
-- Records when/how often the admin panel sent a Supabase magic-link invite
-- (POST /api/admin/waitlist/invite in finflow-api) to each waitlisted email.
-- Columns only — access stays service-role-only (migration 010 set RLS with
-- no public policies, which covers new columns automatically).

alter table public.signup_waitlist
  add column if not exists invite_sent_at timestamptz,
  add column if not exists invites int not null default 0;

comment on column public.signup_waitlist.invite_sent_at is 'Timestamp of the most recent magic-link invite sent from the admin panel.';
comment on column public.signup_waitlist.invites is 'How many invites have been sent to this email.';

-- "Waiting longest, never invited" views in the admin panel sort on this.
create index if not exists signup_waitlist_invite_sent_at_idx
  on public.signup_waitlist (invite_sent_at asc nulls first);
