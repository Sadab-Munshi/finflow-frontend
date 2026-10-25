'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useUser } from '@/context/UserContext'
import {
  DEFAULT_SUBSCRIPTION_SETTINGS,
  evaluateFeatureGate,
  normalizeTier,
  type GateCheckResult,
  type SubscriptionFeatureConfig,
  type SubscriptionOverrideRecord,
  type SubscriptionSettingsConfig,
  type SubscriptionTier,
} from '@/lib/subscription-gate'

/**
 * Feature-gate state for the app shell.
 *
 * ── What changed and why ────────────────────────────────────────────────────
 * This provider used to query five tables directly from the browser:
 *
 *   subscription_settings, subscription_features, user_subscriptions,
 *   subscription_overrides, super_admins
 *
 * …and hold four Supabase realtime channels open on them. That meant a normal
 * user's browser read administrative tables — including the role table — and
 * depended on whatever RLS policy happened to exist for each one.
 *
 * All five reads now happen server-side in GET /api/v1/user/bootstrap against
 * the service role. This provider simply projects that single payload into the
 * shape the existing consumers expect. The browser can no longer reach any of
 * those tables, so this file contains no `createClient()` and no `.from()`.
 *
 * Freshness: the payload is refreshed on route change and on window focus by
 * UserProvider. There is deliberately no polling and no realtime channel —
 * background tabs stay silent.
 */

interface SubscriptionGateContextValue {
  loading: boolean
  settings: SubscriptionSettingsConfig
  features: Record<string, SubscriptionFeatureConfig>
  userTier: SubscriptionTier
  override: SubscriptionOverrideRecord | null
  subscriptionsEnabled: boolean
  paymentsEnabled: boolean
  trialEnabled: boolean
  trialDays: number
  checkFeature: (featureKey: string) => GateCheckResult
  isFeatureEnabled: (featureKey: string) => boolean
  canAccessFeature: (featureKey: string) => boolean
  refresh: () => Promise<void>
}

const SubscriptionGateContext = createContext<SubscriptionGateContextValue>({
  loading: false,
  settings: DEFAULT_SUBSCRIPTION_SETTINGS,
  features: {},
  userTier: 'free',
  override: null,
  subscriptionsEnabled: true,
  paymentsEnabled: true,
  trialEnabled: true,
  trialDays: 7,
  checkFeature: (featureKey: string) =>
    evaluateFeatureGate({
      featureKey,
      featuresMap: {},
      settings: DEFAULT_SUBSCRIPTION_SETTINGS,
      userTier: 'free',
    }),
  isFeatureEnabled: () => true,
  canAccessFeature: () => true,
  refresh: async () => {},
})

export function SubscriptionGateProvider({ children }: { children: React.ReactNode }) {
  const { bootstrap, loading: userLoading, refreshProfile } = useUser()
  const [settled, setSettled] = useState(false)

  // Bootstrap drives everything; no local fetching remains.
  useEffect(() => {
    if (bootstrap || userLoading) setSettled(true)
  }, [bootstrap, userLoading])

  const settings = useMemo<SubscriptionSettingsConfig>(() => {
    const s = bootstrap?.settings
    if (!s) return DEFAULT_SUBSCRIPTION_SETTINGS
    return {
      id: 1,
      subscriptions_enabled: s.subscriptionsEnabled,
      payments_enabled: s.paymentsEnabled,
      trial_enabled: s.trialEnabled,
      trial_days: s.trialDays,
      updated_by: null,
      updated_at: null,
    }
  }, [bootstrap?.settings])

  const features = useMemo<Record<string, SubscriptionFeatureConfig>>(() => {
    const map: Record<string, SubscriptionFeatureConfig> = {}
    for (const row of bootstrap?.features ?? []) {
      const key = String(row.key || '')
      if (!key) continue
      map[key] = {
        key,
        name: row.name || key,
        description: row.description || '',
        enabled: typeof row.enabled === 'boolean' ? row.enabled : true,
        required_tier: normalizeTier(row.required_tier),
        updated_by: row.updated_by ?? null,
        updated_at: row.updated_at ?? null,
        registered: row.registered !== false,
      }
    }
    return map
  }, [bootstrap?.features])

  // `effectiveTier` is resolved server-side (override > subscription > free),
  // which is what the old client-side resolveEffectiveTier() computed.
  const userTier = normalizeTier(bootstrap?.subscription.effectiveTier ?? 'free')

  const override = useMemo<SubscriptionOverrideRecord | null>(() => {
    if (bootstrap?.subscription.source !== 'override') return null
    return {
      user_id: bootstrap.user.id,
      plan: normalizeTier(bootstrap.subscription.effectiveTier),
      status: 'active',
      trial_ends_at: bootstrap.subscription.trialEndsAt,
      expires_at: bootstrap.subscription.expiresAt,
      reason: '',
      updated_by: null,
      updated_at: null,
    }
  }, [bootstrap?.subscription, bootstrap?.user.id])

  const refresh = useCallback(async () => {
    await refreshProfile()
  }, [refreshProfile])

  const checkFeature = useCallback(
    (featureKey: string): GateCheckResult =>
      evaluateFeatureGate({
        featureKey,
        featuresMap: features,
        settings,
        userTier,
      }),
    [features, settings, userTier]
  )

  const isFeatureEnabled = useCallback(
    (featureKey: string): boolean => checkFeature(featureKey).enabled,
    [checkFeature]
  )

  const canAccessFeature = useCallback(
    (featureKey: string): boolean => checkFeature(featureKey).allowed,
    [checkFeature]
  )

  const value = useMemo<SubscriptionGateContextValue>(
    () => ({
      loading: userLoading && !settled,
      settings,
      features,
      userTier,
      override,
      subscriptionsEnabled: settings.subscriptions_enabled,
      paymentsEnabled: settings.payments_enabled,
      trialEnabled: settings.trial_enabled,
      trialDays: settings.trial_days,
      checkFeature,
      isFeatureEnabled,
      canAccessFeature,
      refresh,
    }),
    [
      userLoading,
      settled,
      settings,
      features,
      userTier,
      override,
      checkFeature,
      isFeatureEnabled,
      canAccessFeature,
      refresh,
    ]
  )

  return (
    <SubscriptionGateContext.Provider value={value}>
      {children}
    </SubscriptionGateContext.Provider>
  )
}

export function useSubscriptionGateContext(): SubscriptionGateContextValue {
  return useContext(SubscriptionGateContext)
}
