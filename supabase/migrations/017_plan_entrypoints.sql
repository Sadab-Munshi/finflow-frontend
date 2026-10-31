-- =============================================================================
-- Migration 017: Subscription entry-point visibility switch
--
-- One boolean on the existing settings singleton. When false, the user app
-- stops advertising plans: the "Pro Plans" row leaves both the desktop sidebar
-- and the mobile drawer, and the Profile upgrade / manage-subscription button
-- is not rendered. The routes themselves are untouched — a direct visit to
-- /subscription or /subscription/payments still works, which is what keeps the
-- UPI return-and-verify flow alive.
--
-- Deliberately separate from the two commercial switches:
--   subscriptions_enabled → the rules (trial eligibility, trial_days > 0)
--   payments_enabled      → checkout (order creation, purchases pause)
--   subscription_ui_enabled → discovery only; it never grants or removes access,
--                             and never touches an override or payment record.
--
-- Default true ⇒ existing rows, and any database that has not run this
-- migration, keep today's behaviour. Reads fail open on purpose.
-- =============================================================================

ALTER TABLE public.subscription_settings
  ADD COLUMN IF NOT EXISTS subscription_ui_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.subscription_settings.subscription_ui_enabled IS
  'Show the subscription entry points (Pro Plans nav row, Profile upgrade CTA). '
  'Presentation only: false hides the surface but changes no entitlement, '
  'override or payment record.';
