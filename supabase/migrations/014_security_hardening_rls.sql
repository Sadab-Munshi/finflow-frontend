-- =============================================================================
-- Migration 014: Security Hardening — RLS WITH CHECK, Avatar URL Constraint,
-- and Database-Level Registration Mode & Domain Enforcement
-- =============================================================================

-- 1. Explicit WITH CHECK clauses on FOR UPDATE RLS policies (LOW-03)
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions"
  ON public.transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
CREATE POLICY "Users can update own budgets"
  ON public.budgets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
CREATE POLICY "Users can update own settings"
  ON public.settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Prevent unsafe URI schemes in settings.avatar_url and notifications.link (HIGH-01 / HIGH-02)
ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_avatar_url_https_chk;

ALTER TABLE public.settings
  ADD CONSTRAINT settings_avatar_url_https_chk
  CHECK (
    avatar_url IS NULL
    OR avatar_url = ''
    OR avatar_url ~* '^https://'
  );

-- 3. Enforce registration_mode and allowed_email_domains in enforce_signup_limit() trigger (HIGH-03)
CREATE OR REPLACE FUNCTION public.enforce_signup_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  lim integer;
  reg_mode text;
  allowed_domains_raw text;
  email_domain text;
  domain_list text[];
BEGIN
  -- Check registration mode ('open' | 'invite_only' | 'closed')
  SELECT value INTO reg_mode FROM public.platform_config WHERE key = 'registration_mode';
  IF reg_mode = 'closed' THEN
    RAISE EXCEPTION 'signup_closed: registration is currently closed'
      USING ERRCODE = 'P0001';
  END IF;

  -- Check allowed email domains if configured
  SELECT value INTO allowed_domains_raw FROM public.platform_config WHERE key = 'allowed_email_domains';
  IF allowed_domains_raw IS NOT NULL AND btrim(allowed_domains_raw) <> '' AND new.email IS NOT NULL THEN
    email_domain := lower(split_part(new.email, '@', 2));
    SELECT array_agg(lower(btrim(d)))
      INTO domain_list
      FROM unnest(string_to_array(allowed_domains_raw, ',')) AS d
      WHERE btrim(d) <> '';

    IF domain_list IS NOT NULL AND array_length(domain_list, 1) > 0 AND NOT (email_domain = ANY(domain_list)) THEN
      RAISE EXCEPTION 'signup_domain_restricted: this email domain is not permitted to register'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Check total user capacity cap
  SELECT value::integer INTO lim FROM public.platform_config WHERE key = 'signup_limit';
  IF lim IS NOT NULL AND lim > 0
     AND (SELECT count(*) FROM auth.users) >= lim THEN
    RAISE EXCEPTION 'signup_limit_reached: registration is temporarily closed because the user limit has been reached'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN new;
END $$;
