ALTER TABLE public.user_sessions
ADD COLUMN IF NOT EXISTS supabase_session_id text;
