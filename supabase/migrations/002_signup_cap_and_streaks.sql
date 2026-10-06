-- 002: platform config + admin signup cap + activity streaks
-- Backs the Vertex admin panel signup-limit control and streak enrichment.
-- Apply AFTER finflow-api feat/vertex-admin is deployed (API fails open without it).

-- ── platform_config: key/value store, service-role only ──
create table if not exists platform_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table platform_config enable row level security;
-- No policies: anonymous/authenticated get nothing; the API uses the service
-- role, which bypasses RLS.

-- ── Exact auth.users count (API: admin panel + signup-status) ──
create or replace function auth_user_count()
returns integer
language sql security definer stable
set search_path = public, auth
as $$
  select count(*)::integer from auth.users;
$$;
revoke all on function auth_user_count() from public, anon, authenticated;
grant execute on function auth_user_count() to service_role;

-- ── Hard signup enforcement: rejects signups over the cap no matter the client ──
-- The frontend shows the friendly toast via /api/auth/signup-status; this
-- trigger is the actual gate (direct GoTrue calls can't bypass it).
create or replace function enforce_signup_limit()
returns trigger
language plpgsql security definer
set search_path = public, auth
as $$
declare
  lim integer;
begin
  select value::integer into lim from platform_config where key = 'signup_limit';
  if lim is not null and lim > 0
     and (select count(*) from auth.users) >= lim then
    raise exception 'signup_limit_reached: registration is temporarily closed because the user limit has been reached'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_signup_limit on auth.users;
create trigger trg_enforce_signup_limit
  before insert on auth.users
  for each row execute function enforce_signup_limit();

-- ── Activity streaks: consecutive days with ≥1 transaction, ending today or
-- yesterday (Asia/Kolkata). transactions.date is TEXT — only well-formed
-- YYYY-MM-DD values participate. ──
create or replace function user_activity_streaks()
returns table(user_id uuid, streak_days integer)
language sql security definer stable
set search_path = public
as $$
with days as (
  select distinct t.user_id as uid, t.date::date as d
  from transactions t
  where t.date ~ '^\d{4}-\d{2}-\d{2}$'
),
numbered as (
  select uid, d,
         d - (row_number() over (partition by uid order by d))::int as grp
  from days
),
groups as (
  select uid, grp, max(d) as last_day, count(*)::integer as len
  from numbered
  group by uid, grp
)
select uid as user_id, len as streak_days
from groups
where last_day >= (now() at time zone 'Asia/Kolkata')::date - 1;
$$;
revoke all on function user_activity_streaks() from public, anon, authenticated;
grant execute on function user_activity_streaks() to service_role;
