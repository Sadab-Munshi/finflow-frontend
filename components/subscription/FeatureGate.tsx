'use client'

import React from 'react'
import Link from 'next/link'
import { Crown, Lock, Ban, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate'
import { TIER_DISPLAY_NAMES, type FeatureKey } from '@/lib/subscription-gate'

interface FeatureGateProps {
  feature: FeatureKey
  children: React.ReactNode
  mode?: 'banner' | 'inline'
  title?: string
}

export default function FeatureGate({
  feature,
  children,
  mode = 'banner',
  title,
}: FeatureGateProps) {
  const t = useTranslations('subscriptionGate')
  const { checkFeature } = useSubscriptionGate()
  const gate = checkFeature(feature)

  if (gate.allowed) {
    return <>{children}</>
  }

  const displayName = title || gate.featureName || feature
  const tierLabel = TIER_DISPLAY_NAMES[gate.requiredTier] || 'Pro'
  const currentLabel = TIER_DISPLAY_NAMES[gate.currentTier] || 'Free'

  // Minimal single-row disabled UI (especially compact on mobile for Telegram, WhatsApp, Quick Entry, etc.)
  if (gate.reason === 'feature_disabled') {
    if (mode === 'inline') {
      return (
        <div
          role="status"
          className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-slate-700 truncate">
              {displayName}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-semibold whitespace-nowrap shrink-0">
            {t('disabledBadge')}
          </span>
        </div>
      )
    }

    return (
      <div
        role="status"
        className="rounded-xl border border-slate-200 bg-white shadow-2xs px-4 py-3 flex items-center justify-between gap-3 max-w-lg mx-auto my-2"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <Ban className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{t('featureDisabledShort')}</p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold whitespace-nowrap shrink-0">
          {t('disabledBadge')}
        </span>
      </div>
    )
  }

  // Compact single-row inline upgrade prompt
  if (mode === 'inline') {
    return (
      <div className="rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/80 to-teal-50/50 px-3 py-2.5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                {displayName}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-extrabold uppercase shrink-0">
                <Crown className="w-2.5 h-2.5 text-amber-600" />
                {tierLabel}
              </span>
            </div>
          </div>
        </div>
        {gate.paymentsEnabled ? (
          <Link
            href="/subscription"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0F766E] to-[#059669] hover:from-[#115E59] hover:to-[#047857] text-white text-xs font-bold transition-all shadow-2xs whitespace-nowrap shrink-0"
          >
            <span>{t('upgradeCta', { tier: tierLabel })}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold whitespace-nowrap shrink-0">
            {t('paymentsDisabledBadge')}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white via-[#F0FDFA]/60 to-amber-50/60 shadow-sm p-5 sm:p-6 text-center max-w-md mx-auto my-3">
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-extrabold uppercase tracking-wide mb-2">
        <Lock className="w-3 h-3" />
        {t('tierRequiredBadge', { tier: tierLabel })}
      </span>
      <h2 className="text-base sm:text-lg font-bold text-slate-900">
        {t('upgradeTitle', { feature: displayName, tier: tierLabel })}
      </h2>
      <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
        {gate.paymentsEnabled
          ? t('upgradeDesc', { feature: displayName, tier: tierLabel, current: currentLabel })
          : t('paymentsPausedDesc', { tier: tierLabel })}
      </p>
      <div className="mt-4 flex justify-center">
        {gate.paymentsEnabled ? (
          <Link
            href="/subscription"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#059669] hover:from-[#115E59] hover:to-[#047857] text-white text-xs sm:text-sm font-bold transition-all shadow-sm"
          >
            {t('upgradeCta', { tier: tierLabel })}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <Link
            href="/subscription"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            {t('viewPlanStatus')}
          </Link>
        )}
      </div>
    </div>
  )
}
