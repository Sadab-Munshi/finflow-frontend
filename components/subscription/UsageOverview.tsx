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
  }
> = {
  nlp: {
    Icon: MessageSquareText,
    cardBg: 'bg-gradient-to-br from-teal-50/75 via-white to-emerald-50/40',
    cardBorder: 'border-teal-200/80',
    iconBg: 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white',
    barGradient: 'bg-gradient-to-r from-teal-600 to-emerald-500',
  },
  receipt: {
    Icon: ScanLine,
    cardBg: 'bg-gradient-to-br from-indigo-50/75 via-white to-violet-50/40',
    cardBorder: 'border-indigo-200/80',
    iconBg: 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white',
    barGradient: 'bg-gradient-to-r from-indigo-600 to-violet-500',
  },
  voice: {
    Icon: Mic,
    cardBg: 'bg-gradient-to-br from-amber-50/75 via-white to-orange-50/40',
    cardBorder: 'border-amber-200/80',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
    barGradient: 'bg-gradient-to-r from-amber-500 to-orange-500',
  },
  insights: {
    Icon: Lightbulb,
    cardBg: 'bg-gradient-to-br from-sky-50/75 via-white to-blue-50/40',
    cardBorder: 'border-sky-200/80',
    iconBg: 'bg-gradient-to-br from-sky-600 to-blue-600 text-white',
    barGradient: 'bg-gradient-to-r from-sky-600 to-blue-500',
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
      className="rounded-2xl bg-white border border-[#E2E8F0] shadow-xs p-4 sm:p-6"
    >
      {/* Compact Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3.5 sm:mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-lg font-extrabold text-[#0F172A]">
              Monthly Feature Usage
            </h2>
            {isBoosted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <Zap className="w-3 h-3 text-amber-600 fill-amber-500 shrink-0" />
                <span>
                  {unlimitedAi ? '9,999/mo' : `${effectiveMultiplier}× Pro`}
                </span>
              </span>
            )}
          </div>
          <p className="hidden sm:block text-xs text-[#64748B] mt-0.5">
            Track how much of your monthly AI allowance you have used
          </p>
        </div>

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0FDFA] border border-[#CCFBF1] text-[11px] sm:text-xs font-semibold text-[#0F766E] whitespace-nowrap shrink-0">
          <CalendarClock className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
          <span>Resets {resetDateLabel}</span>
        </div>
      </div>

      {/* 2x2 Grid on Mobile, 4-Column Grid on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
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
              className={`rounded-xl sm:rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-3 sm:p-4 flex flex-col justify-between gap-2.5 sm:gap-3`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#0F172A] truncate">
                    {item.label}
                  </p>
                  <p className="hidden sm:block text-xs text-[#64748B] truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-1 text-xs">
                  <span
                    className="font-extrabold text-xs sm:text-base text-[#0F172A]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {item.usageText}
                  </span>
                  <span
                    className={`font-semibold text-[10px] sm:text-[11px] ${
                      item.tone === 'danger'
                        ? 'text-[#B91C1C]'
                        : item.tone === 'warning'
                        ? 'text-[#B45309]'
                        : 'text-[#0F766E]'
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
                  className="w-full h-1.5 sm:h-2 rounded-full bg-slate-200/80 overflow-hidden"
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
