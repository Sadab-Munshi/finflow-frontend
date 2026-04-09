-- Create user_sessions table for per-device session management
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_token text not null unique,
  device_name text,
  browser text,
  os text,
  ip_address text,
  location text,
  is_current boolean default false,
  last_active_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Index for fast lookup by user
create index on public.user_sessions(user_id);

-- RLS policies
alter table public.user_sessions enable row level security;

create policy "Users can view own sessions"
  on public.user_sessions for select
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.user_sessions for delete
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.user_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.user_sessions for update
  using (auth.uid() = user_id);
