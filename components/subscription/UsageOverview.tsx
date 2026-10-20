'use client'

import React from 'react'
import {
  MessageSquareText,
  ScanLine,
  Mic,
  Lightbulb,
  CalendarClock,
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
}

const METRIC_ICONS: Record<QuotaMetricKey, React.ComponentType<{ className?: string }>> = {
  nlp: MessageSquareText,
  receipt: ScanLine,
  voice: Mic,
  insights: Lightbulb,
}

export function UsageOverview({ quotas, unlimitedAi = false }: UsageOverviewProps) {
  const metrics = getNormalizedUsageMetrics(quotas, unlimitedAi)
  const resetDateLabel = getNextMonthlyResetDate()

  return (
    <section
      aria-label="Monthly AI feature usage"
      className="rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
            Monthly Feature Usage
          </h2>
          <p className="text-xs sm:text-sm text-[#475569]">
            Track how much of your monthly AI allowance you have used
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#475569] self-start sm:self-auto">
          <CalendarClock className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
          <span>Resets on {resetDateLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {metrics.map((item) => {
          const Icon = METRIC_ICONS[item.key]
          const barColor =
            item.tone === 'danger'
              ? 'bg-[#DC2626]'
              : item.tone === 'warning'
              ? 'bg-[#D97706]'
              : 'bg-[#0F766E]'

          return (
            <div
              key={item.key}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] truncate">
                    {item.label}
                  </p>
                  <p className="text-xs text-[#64748B] truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#0F766E] shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span
                    className="font-bold text-sm text-[#0F172A]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {item.usageText}
                  </span>
                  <span
                    className={`font-medium ${
                      item.tone === 'danger'
                        ? 'text-[#B91C1C]'
                        : item.tone === 'warning'
                        ? 'text-[#B45309]'
                        : 'text-[#475569]'
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
                  className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${Math.max(item.percentage, item.used > 0 ? 4 : 0)}%` }}
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
