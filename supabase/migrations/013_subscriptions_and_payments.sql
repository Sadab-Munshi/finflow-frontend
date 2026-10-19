-- =============================================================================
-- Migration 013: YOUPI PG Subscriptions & Payment Orders
-- =============================================================================
-- Stores user subscription tiers (free, test_1inr, pro_monthly, pro_yearly)
-- and tracks payment orders + webhook deliveries from YOUPI PG
-- (https://pay.sadabmunshi.me / https://pay-api.sadabmunshi.me).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id               TEXT NOT NULL DEFAULT 'free'
                        CHECK (plan_id IN ('free', 'test_1inr', 'pro_monthly', 'pro_yearly')),
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'expired', 'cancelled')),
  current_period_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end    TIMESTAMPTZ,
  last_order_id         TEXT,
  last_payment_id       TEXT,
  last_utr              TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_status
  ON public.user_subscriptions (plan_id, status);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.user_subscriptions;
CREATE POLICY "Service role manages subscriptions"
  ON public.user_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- Payment Orders (tracks every YOUPI PG checkout session & webhook status)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_orders (
  order_id              TEXT PRIMARY KEY,
  payment_id            TEXT NOT NULL,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id               TEXT NOT NULL
                        CHECK (plan_id IN ('free', 'test_1inr', 'pro_monthly', 'pro_yearly')),
  amount_inr            NUMERIC(10, 2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'INR',
  status                TEXT NOT NULL DEFAULT 'INITIATED'
                        CHECK (status IN ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED', 'SUSPICIOUS')),
  utr                   TEXT,
  payment_method        TEXT DEFAULT 'UPI',
  checkout_url          TEXT,
  webhook_delivery_id   TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at               TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created
  ON public.payment_orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_orders_payment_id
  ON public.payment_orders (payment_id);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment orders" ON public.payment_orders;
CREATE POLICY "Users can view own payment orders"
  ON public.payment_orders
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages payment orders" ON public.payment_orders;
CREATE POLICY "Service role manages payment orders"
  ON public.payment_orders
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
