-- =============================================================================
-- Migration 014: Subscription Control Center & Super-Admin Governance
-- Non-destructive & idempotent: preserves existing feature_flags,
-- user_subscriptions, payment_orders, and admin_audit tables.
-- =============================================================================

-- 1. Super-Admin Allowlist Table
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper: checks whether a user is a super admin via public.super_admins OR
-- Supabase Auth app_metadata.role = 'super_admin'.
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.super_admins sa
    WHERE sa.user_id = check_user_id
  ) THEN
    RETURN true;
  END IF;

  IF check_user_id = auth.uid()
     AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 2. Global Subscription & Payment Controls (Singleton Row id = 1)
CREATE TABLE IF NOT EXISTS public.subscription_settings (
  id                    integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  subscriptions_enabled boolean NOT NULL DEFAULT true,
  payments_enabled      boolean NOT NULL DEFAULT true,
  trial_days            integer NOT NULL DEFAULT 7 CHECK (trial_days >= 0 AND trial_days <= 365),
  updated_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 3. Per-Feature Availability & Minimum Plan Tier Matrix
CREATE TABLE IF NOT EXISTS public.subscription_features (
  key           text PRIMARY KEY,
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  enabled       boolean NOT NULL DEFAULT true,
  required_tier text NOT NULL DEFAULT 'free' CHECK (required_tier IN ('free', 'pro', 'premium')),
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 4. Super-Admin Per-User Subscription Overrides
CREATE TABLE IF NOT EXISTS public.subscription_overrides (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan          text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'cancelled', 'expired')),
  trial_ends_at timestamptz,
  expires_at    timestamptz,
  reason        text NOT NULL DEFAULT '',
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_overrides_status
  ON public.subscription_overrides(status);

CREATE INDEX IF NOT EXISTS idx_subscription_features_tier
  ON public.subscription_features(required_tier);

-- =============================================================================
-- Row-Level Security (RLS)
-- =============================================================================

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_overrides ENABLE ROW LEVEL SECURITY;

-- super_admins: readable by the user themselves or any super admin; writable only by super admins
DROP POLICY IF EXISTS "super_admins_select_self_or_super" ON public.super_admins;
CREATE POLICY "super_admins_select_self_or_super"
  ON public.super_admins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super_admins_write_super_only" ON public.super_admins;
CREATE POLICY "super_admins_write_super_only"
  ON public.super_admins
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- subscription_settings: readable by public/authenticated clients for live UI gating;
-- writable strictly by super admins
DROP POLICY IF EXISTS "subscription_settings_read_all" ON public.subscription_settings;
CREATE POLICY "subscription_settings_read_all"
  ON public.subscription_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "subscription_settings_write_super_only" ON public.subscription_settings;
CREATE POLICY "subscription_settings_write_super_only"
  ON public.subscription_settings
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- subscription_features: readable by public/authenticated clients for live UI gating;
-- writable strictly by super admins
DROP POLICY IF EXISTS "subscription_features_read_all" ON public.subscription_features;
CREATE POLICY "subscription_features_read_all"
  ON public.subscription_features
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "subscription_features_write_super_only" ON public.subscription_features;
CREATE POLICY "subscription_features_write_super_only"
  ON public.subscription_features
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- subscription_overrides: readable by the affected user or any super admin;
-- writable strictly by super admins
DROP POLICY IF EXISTS "subscription_overrides_read_owner_or_super" ON public.subscription_overrides;
CREATE POLICY "subscription_overrides_read_owner_or_super"
  ON public.subscription_overrides
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "subscription_overrides_write_super_only" ON public.subscription_overrides;
CREATE POLICY "subscription_overrides_write_super_only"
  ON public.subscription_overrides
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- =============================================================================
-- Realtime Publication (idempotent)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_settings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_features;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_overrides;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- =============================================================================
-- Safe Default Seeds (non-disruptive initial rollout: enabled = true, free tier)
-- =============================================================================
INSERT INTO public.subscription_settings (id, subscriptions_enabled, payments_enabled, trial_days)
VALUES (1, true, true, 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscription_features (key, name, description, enabled, required_tier)
VALUES
  ('ai_summaries', 'AI Summaries & Insights', 'AI-generated spending insights and monthly report executive summaries.', true, 'free'),
  ('nlp_entry', 'Smart Text (NLP) Entry', 'Natural-language expense and income parsing in English, Hindi, and Bengali.', true, 'free'),
  ('voice_entry', 'Voice Entry', 'Speech-to-text multilingual voice transaction entry.', true, 'free'),
  ('receipt_scan', 'Receipt & PDF Scan', 'OCR receipt photo and bank statement PDF transaction scanning.', true, 'free'),
  ('pdf_export', 'PDF Reports & Export', 'Monthly downloadable PDF financial statements and email reports.', true, 'free'),
  ('advanced_analytics', 'Advanced Analytics', 'Rolling averages, cash-flow forecasting, anomaly detection, and YoY comparisons.', true, 'free'),
  ('telegram', 'Telegram Sync', 'Two-way Telegram bot transaction logging, alerts, and notifications.', true, 'free'),
  ('whatsapp', 'WhatsApp Sync', 'Two-way WhatsApp bot transaction logging, alerts, and notifications.', true, 'free'),
  ('push_notifications', 'Push Notifications', 'Real-time browser and PWA web push alerts for budgets and daily summaries.', true, 'free')
ON CONFLICT (key) DO NOTHING;
