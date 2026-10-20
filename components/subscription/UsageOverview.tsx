'use client'

import React from 'react'
import {
  MessageSquareText,
  ScanLine,
  Mic,
  Lightbulb,
  CalendarClock,
  Zap,
} from 'lucide-react'
import {
  getNormalizedUsageMetrics,
  getNextMonthlyResetDate,
  type AiQuotasPayload,
  type QuotaMetricKey,
} from '@/lib/subscription-utils'

interface UsageOverviewProps {
  quotas: AiQuotasPayload | null | undefined
  unlimitedAi?: boolean
  aiMultiplier?: number
}

const METRIC_THEME: Record<
  QuotaMetricKey,
  {
    Icon: React.ComponentType<{ className?: string }>
    cardBg: string
    cardBorder: string
    iconBg: string
    barGradient: string
    badgeBg: string
    badgeText: string
  }
> = {
  nlp: {
    Icon: MessageSquareText,
    cardBg: 'bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/50',
    cardBorder: 'border-teal-200/80',
    iconBg: 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-sm shadow-teal-600/25',
    barGradient: 'bg-gradient-to-r from-teal-600 to-emerald-500',
    badgeBg: 'bg-teal-100/80 text-teal-800',
    badgeText: '5× Pro',
  },
  receipt: {
    Icon: ScanLine,
    cardBg: 'bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50',
    cardBorder: 'border-indigo-200/80',
    iconBg: 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/25',
    barGradient: 'bg-gradient-to-r from-indigo-600 to-violet-500',
    badgeBg: 'bg-indigo-100/80 text-indigo-800',
    badgeText: '5× Pro',
  },
  voice: {
    Icon: Mic,
    cardBg: 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50',
    cardBorder: 'border-amber-200/80',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-500/25',
    barGradient: 'bg-gradient-to-r from-amber-500 to-orange-500',
    badgeBg: 'bg-amber-100/80 text-amber-800',
    badgeText: '5× Pro',
  },
  insights: {
    Icon: Lightbulb,
    cardBg: 'bg-gradient-to-br from-sky-50/80 via-white to-blue-50/50',
    cardBorder: 'border-sky-200/80',
    iconBg: 'bg-gradient-to-br from-sky-600 to-blue-600 text-white shadow-sm shadow-sky-600/25',
    barGradient: 'bg-gradient-to-r from-sky-600 to-blue-500',
    badgeBg: 'bg-sky-100/80 text-sky-800',
    badgeText: '5× Pro',
  },
}

export function UsageOverview({
  quotas,
  unlimitedAi = false,
  aiMultiplier = 1,
}: UsageOverviewProps) {
  const effectiveMultiplier = Math.max(1, Number(aiMultiplier) || 1)
  const metrics = getNormalizedUsageMetrics(quotas, unlimitedAi, effectiveMultiplier)
  const resetDateLabel = getNextMonthlyResetDate()
  const isBoosted = unlimitedAi || effectiveMultiplier > 1

  return (
    <section
      aria-label="Monthly AI feature usage"
      className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
              Monthly Feature Usage
            </h2>
            {isBoosted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 border border-amber-300">
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0" />
                <span>
                  {unlimitedAi
                    ? 'Pro Yearly 9,999/mo Active'
                    : `${effectiveMultiplier}× Pro Quota Active`}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            Track how much of your monthly AI allowance you have used
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-semibold text-[#0F766E] self-start sm:self-auto">
          <CalendarClock className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
          <span>Resets on {resetDateLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {metrics.map((item) => {
          const theme = METRIC_THEME[item.key]
          const Icon = theme.Icon
          const barColor =
            item.tone === 'danger'
              ? 'bg-gradient-to-r from-rose-600 to-red-500'
              : item.tone === 'warning'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
              : theme.barGradient

          return (
            <div
              key={item.key}
              className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-4 flex flex-col justify-between gap-3.5 shadow-2xs transition-transform hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-[#0F172A] truncate">
                      {item.label}
                    </p>
                    {isBoosted && (
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${theme.badgeBg}`}
                      >
                        {unlimitedAi ? 'MAX' : `${effectiveMultiplier}×`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#475569] truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span
                    className="font-extrabold text-base text-[#0F172A]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {item.usageText}
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                      item.tone === 'danger'
                        ? 'bg-rose-100 text-[#B91C1C]'
                        : item.tone === 'warning'
                        ? 'bg-amber-100 text-[#B45309]'
                        : 'bg-white/90 text-[#0F766E] border border-[#E2E8F0]'
                    }`}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {item.remainingText}
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-label={`${item.label} usage`}
                  aria-valuenow={item.used}
                  aria-valuemin={0}
                  aria-valuemax={item.limit}
                  className="w-full h-2.5 rounded-full bg-slate-200/80 overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{
                      width: `${Math.max(item.percentage, item.used > 0 ? 5 : 2)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
