'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import {
  DEFAULT_SUBSCRIPTION_SETTINGS,
  evaluateFeatureGate,
  normalizeTier,
  resolveEffectiveTier,
  type GateCheckResult,
  type SubscriptionFeatureConfig,
  type SubscriptionOverrideRecord,
  type SubscriptionSettingsConfig,
  type SubscriptionTier,
} from '@/lib/subscription-gate'

interface SubscriptionGateContextValue {
  loading: boolean
  settings: SubscriptionSettingsConfig
  features: Record<string, SubscriptionFeatureConfig>
  userTier: SubscriptionTier
  override: SubscriptionOverrideRecord | null
  isSuperAdmin: boolean
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
  isSuperAdmin: false,
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
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<SubscriptionSettingsConfig>(DEFAULT_SUBSCRIPTION_SETTINGS)
  const [features, setFeatures] = useState<Record<string, SubscriptionFeatureConfig>>({})
  const [userTier, setUserTier] = useState<SubscriptionTier>('free')
  const [override, setOverride] = useState<SubscriptionOverrideRecord | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient()
      const userId = user?.userId || null

      const [settingsRes, featuresRes, subRes, overrideRes, superRes] = await Promise.all([
        supabase.from('subscription_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('subscription_features').select('*'),
        userId
          ? supabase
              .from('user_subscriptions')
              .select('plan_id, status, current_period_end')
              .eq('user_id', userId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        userId
          ? supabase
              .from('subscription_overrides')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        userId
          ? supabase
              .from('super_admins')
              .select('user_id')
              .eq('user_id', userId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (!settingsRes.error && settingsRes.data) {
        const s = settingsRes.data as Record<string, unknown>
        setSettings({
          id: 1,
          subscriptions_enabled:
            typeof s.subscriptions_enabled === 'boolean' ? s.subscriptions_enabled : true,
          payments_enabled:
            typeof s.payments_enabled === 'boolean' ? s.payments_enabled : true,
          trial_enabled:
            typeof s.trial_enabled === 'boolean' ? s.trial_enabled : true,
          trial_days: typeof s.trial_days === 'number' ? s.trial_days : 7,
          updated_by: (s.updated_by as string | null) ?? null,
          updated_at: (s.updated_at as string | null) ?? null,
        })
      }

      if (!featuresRes.error && Array.isArray(featuresRes.data)) {
        const map: Record<string, SubscriptionFeatureConfig> = {}
        for (const row of featuresRes.data as Array<Record<string, unknown>>) {
          const key = String(row.key || '')
          if (!key) continue
          map[key] = {
            key,
            name: String(row.name || key),
            description: String(row.description || ''),
            enabled: typeof row.enabled === 'boolean' ? row.enabled : true,
            required_tier: normalizeTier(row.required_tier),
            updated_by: (row.updated_by as string | null) ?? null,
            updated_at: (row.updated_at as string | null) ?? null,
            registered: true,
          }
        }
        setFeatures(map)
      }

      const ov = !overrideRes.error && overrideRes.data
        ? (overrideRes.data as unknown as SubscriptionOverrideRecord)
        : null
      setOverride(ov)

      const subRow = !subRes.error && subRes.data ? (subRes.data as any) : null
      setUserTier(resolveEffectiveTier(subRow, ov))
      setIsSuperAdmin(Boolean(!superRes.error && superRes.data))
    } catch {
      // Safe fallback to permissive defaults on network/pre-migration environments
    } finally {
      setLoading(false)
    }
  }, [user?.userId])

  useEffect(() => {
    refresh()

    const supabase = createClient()
    const channel = supabase
      .channel('subscription-controls-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscription_settings' },
        () => { refresh() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscription_features' },
        () => { refresh() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscription_overrides' },
        () => { refresh() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_subscriptions' },
        () => { refresh() }
      )
      .subscribe()

    const onFocus = () => { refresh() }
    window.addEventListener('focus', onFocus)

    return () => {
      window.removeEventListener('focus', onFocus)
      supabase.removeChannel(channel)
    }
  }, [refresh])

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
      loading,
      settings,
      features,
      userTier,
      override,
      isSuperAdmin,
      subscriptionsEnabled: settings.subscriptions_enabled,
      paymentsEnabled: settings.payments_enabled,
      trialEnabled: settings.trial_enabled,
      trialDays: settings.trial_days,
      checkFeature,
      isFeatureEnabled,
      canAccessFeature,
      refresh,
    }),
    [loading, settings, features, userTier, override, isSuperAdmin, checkFeature, isFeatureEnabled, canAccessFeature, refresh]
  )

  return (
    <SubscriptionGateContext.Provider value={value}>
      {children}
    </SubscriptionGateContext.Provider>
  )
}

export function useSubscriptionGateContext() {
  return useContext(SubscriptionGateContext)
}
