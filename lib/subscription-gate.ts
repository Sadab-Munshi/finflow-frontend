export type SubscriptionTier = 'free' | 'pro' | 'max'
export type OverrideStatus = 'active' | 'trialing' | 'cancelled' | 'expired'

export const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  max: 2,
}

export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  pro: 'Pro',
  max: 'Max',
}

export const FEATURE_KEYS = {
  AI_SUMMARIES: 'ai_summaries',
  NLP_ENTRY: 'nlp_entry',
  VOICE_ENTRY: 'voice_entry',
  RECEIPT_SCAN: 'receipt_scan',
  PDF_EXPORT: 'pdf_export',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  TELEGRAM: 'telegram',
  WHATSAPP: 'whatsapp',
  PUSH_NOTIFICATIONS: 'push_notifications',
} as const

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS] | (string & {})

export interface SubscriptionSettingsConfig {
  id: number
  subscriptions_enabled: boolean
  payments_enabled: boolean
  trial_enabled: boolean
  trial_days: number
  updated_by?: string | null
  updated_at?: string | null
}

export interface SubscriptionFeatureConfig {
  key: string
  name: string
  description: string
  enabled: boolean
  required_tier: SubscriptionTier
  updated_by?: string | null
  updated_at?: string | null
  registered?: boolean
}

export interface SubscriptionOverrideRecord {
  user_id: string
  plan: SubscriptionTier
  status: OverrideStatus
  trial_ends_at: string | null
  expires_at: string | null
  reason: string
  updated_by?: string | null
  updated_at?: string | null
}

export interface UserSubscriptionRow {
  user_id?: string
  plan_id?: string | null
  status?: string | null
  current_period_end?: string | null
}

export interface GateCheckResult {
  allowed: boolean
  enabled: boolean
  reason: 'allowed' | 'open_access' | 'unregistered_default' | 'feature_disabled' | 'upgrade_required'
  feature: string
  featureName: string
  requiredTier: SubscriptionTier
  currentTier: SubscriptionTier
  paymentsEnabled: boolean
  subscriptionsEnabled: boolean
}

export const DEFAULT_SUBSCRIPTION_SETTINGS: SubscriptionSettingsConfig = {
  id: 1,
  subscriptions_enabled: true,
  payments_enabled: true,
  trial_enabled: true,
  trial_days: 7,
  updated_by: null,
  updated_at: null,
}

export function normalizeTier(value: unknown): SubscriptionTier {
  if (value === 'max' || value === 'premium') return 'max'
  if (value === 'pro') return 'pro'
  return 'free'
}

export function mapPlanIdToTier(planId: string | null | undefined): SubscriptionTier {
  if (planId === 'pro_yearly' || planId === 'max' || planId === 'premium') return 'max'
  if (planId === 'pro_monthly' || planId === 'test_1inr' || planId === 'pro') return 'pro'
  return 'free'
}

export function resolveEffectiveTier(
  subRow: UserSubscriptionRow | null | undefined,
  overrideRow: SubscriptionOverrideRecord | null | undefined,
  nowMs = Date.now()
): SubscriptionTier {
  if (overrideRow) {
    const plan = normalizeTier(overrideRow.plan)
    let status: OverrideStatus = overrideRow.status || 'active'
    const trialEndsMs = overrideRow.trial_ends_at ? new Date(overrideRow.trial_ends_at).getTime() : null
    const expiresMs = overrideRow.expires_at ? new Date(overrideRow.expires_at).getTime() : null

    if (status === 'trialing' && trialEndsMs && !Number.isNaN(trialEndsMs) && trialEndsMs <= nowMs) {
      status = 'expired'
    }
    if ((status === 'active' || status === 'trialing') && expiresMs && !Number.isNaN(expiresMs) && expiresMs <= nowMs) {
      status = 'expired'
    }

    if (status === 'active' || status === 'trialing') {
      return plan
    }
    return 'free'
  }

  if (subRow) {
    const endMs = subRow.current_period_end ? new Date(subRow.current_period_end).getTime() : null
    const isActive = subRow.status === 'active' && (!endMs || Number.isNaN(endMs) || endMs > nowMs)
    if (isActive) {
      return mapPlanIdToTier(subRow.plan_id)
    }
  }

  return 'free'
}

/**
 * Pure, deterministic evaluation of a feature's availability & tier requirement.
 * - Unregistered features default to enabled (`free`) for backward-compatible rollout.
 * - Per-feature `enabled = false` blocks everyone (including Pro/Max and even when `subscriptions_enabled = false`).
 * - Master switch `subscriptions_enabled = false` opens all enabled features to everyone regardless of tier.
 */
export function evaluateFeatureGate(params: {
  featureKey: string
  featuresMap: Record<string, SubscriptionFeatureConfig> | Map<string, SubscriptionFeatureConfig>
  settings?: SubscriptionSettingsConfig | null
  userTier?: SubscriptionTier
}): GateCheckResult {
  const { featureKey, featuresMap } = params
  const settings = params.settings ?? DEFAULT_SUBSCRIPTION_SETTINGS
  const currentTier = normalizeTier(params.userTier)

  const feature =
    featuresMap instanceof Map ? featuresMap.get(featureKey) : featuresMap[featureKey]

  // Safe default for unregistered features
  if (!feature) {
    return {
      allowed: true,
      enabled: true,
      reason: 'unregistered_default',
      feature: featureKey,
      featureName: featureKey,
      requiredTier: 'free',
      currentTier,
      paymentsEnabled: settings.payments_enabled,
      subscriptionsEnabled: settings.subscriptions_enabled,
    }
  }

  // Per-feature kill switch takes top precedence
  if (!feature.enabled) {
    return {
      allowed: false,
      enabled: false,
      reason: 'feature_disabled',
      feature: feature.key,
      featureName: feature.name || feature.key,
      requiredTier: normalizeTier(feature.required_tier),
      currentTier,
      paymentsEnabled: settings.payments_enabled,
      subscriptionsEnabled: settings.subscriptions_enabled,
    }
  }

  // Master kill switch OFF → open access to all enabled features
  if (!settings.subscriptions_enabled) {
    return {
      allowed: true,
      enabled: true,
      reason: 'open_access',
      feature: feature.key,
      featureName: feature.name || feature.key,
      requiredTier: normalizeTier(feature.required_tier),
      currentTier,
      paymentsEnabled: settings.payments_enabled,
      subscriptionsEnabled: false,
    }
  }

  const requiredTier = normalizeTier(feature.required_tier)
  const allowed = TIER_RANK[currentTier] >= TIER_RANK[requiredTier]

  return {
    allowed,
    enabled: true,
    reason: allowed ? 'allowed' : 'upgrade_required',
    feature: feature.key,
    featureName: feature.name || feature.key,
    requiredTier,
    currentTier,
    paymentsEnabled: settings.payments_enabled,
    subscriptionsEnabled: true,
  }
}
