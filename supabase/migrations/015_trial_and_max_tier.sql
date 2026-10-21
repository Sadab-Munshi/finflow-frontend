-- =============================================================================
-- Migration 015: Free Trial Master Switch, One-Time Per-User Trials & Max Tier
-- Non-destructive & idempotent upgrade on top of Migration 014.
-- =============================================================================

-- 1. Add `trial_enabled` master toggle to `public.subscription_settings`
ALTER TABLE public.subscription_settings
  ADD COLUMN IF NOT EXISTS trial_enabled boolean NOT NULL DEFAULT true;

UPDATE public.subscription_settings
SET trial_enabled = COALESCE(trial_enabled, true)
WHERE id = 1;

-- 2. Upgrade tier constraints to canonical ('free', 'pro', 'max') while keeping
--    legacy 'premium' accepted at the DB boundary and migrating existing rows to 'max'
ALTER TABLE public.subscription_features
  DROP CONSTRAINT IF EXISTS subscription_features_required_tier_check;

UPDATE public.subscription_features
SET required_tier = 'max'
WHERE required_tier = 'premium';

ALTER TABLE public.subscription_features
  ADD CONSTRAINT subscription_features_required_tier_check
  CHECK (required_tier IN ('free', 'pro', 'max', 'premium'));

ALTER TABLE public.subscription_overrides
  DROP CONSTRAINT IF EXISTS subscription_overrides_plan_check;

UPDATE public.subscription_overrides
SET plan = 'max'
WHERE plan = 'premium';

ALTER TABLE public.subscription_overrides
  ADD CONSTRAINT subscription_overrides_plan_check
  CHECK (plan IN ('free', 'pro', 'max', 'premium'));

-- 3. Strictly One-Time Per-User Free Trial Ledger (`user_id` PRIMARY KEY)
CREATE TABLE IF NOT EXISTS public.user_trials (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id    text NOT NULL DEFAULT 'pro_monthly',
  trial_days integer NOT NULL DEFAULT 7 CHECK (trial_days > 0 AND trial_days <= 365),
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at    timestamptz NOT NULL
);

ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_trials_read_owner_or_super" ON public.user_trials;
CREATE POLICY "user_trials_read_owner_or_super"
  ON public.user_trials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "user_trials_write_super_only" ON public.user_trials;
CREATE POLICY "user_trials_write_super_only"
  ON public.user_trials
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_trials;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
