ALTER TABLE public.user_sessions
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;
