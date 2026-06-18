'use client'

import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { formatIndianCurrency } from '@/lib/utils'
import type { YoYComparison as YoYData } from '@/lib/analytics-types'

function ChangeBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const isPositive = value > 0
  const isNeutral = value === 0

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        isNeutral
          ? 'bg-gray-100 text-gray-500'
          : isPositive
            ? 'bg-green-50 text-[#10B981]'
            : 'bg-red-50 text-[#EF4444]'
      }`}
    >
      {!isNeutral && (
        isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />
      )}
      {isPositive ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  )
}

function formatMonth(monthKey: string): string {
  if (!monthKey) return ''
  const [year, month] = monthKey.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export default function YoYComparison({ data }: { data: YoYData }) {
  const { current, previous, changes } = data

  const metrics = [
    {
      label: 'Income',
      current: current.income,
      previous: previous.income,
      change: changes.incomePct,
      color: '#10B981',
      bgColor: '#f4fbf7',
      borderColor: '#e2f5ec',
    },
    {
      label: 'Expenses',
      current: current.expense,
      previous: previous.expense,
      change: changes.expensePct,
      color: '#EF4444',
      bgColor: '#fff5f5',
      borderColor: '#ffe1e1',
    },
    {
      label: 'Savings',
      current: current.savings,
      previous: previous.savings,
      change: changes.savingsPct,
      color: '#8B5CF6',
      bgColor: '#FAF9FF',
      borderColor: '#eae6ff',
    },
  ]

  return (
    <div className="space-y-3">
      {/* Period labels */}
      <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
        <span className="font-medium">{formatMonth(previous.month)}</span>
        <ArrowRight className="w-3 h-3" />
        <span className="font-medium">{formatMonth(current.month)}</span>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center text-center border"
            style={{ backgroundColor: m.bgColor, borderColor: m.borderColor }}
          >
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium mb-1.5">{m.label}</span>
            <span className="text-sm sm:text-base font-bold text-[#0F172A]">
              {formatIndianCurrency(m.current)}
            </span>
            <div className="mt-1.5">
              <ChangeBadge value={m.change} />
            </div>
            <span className="text-[10px] text-[#9CA3AF] mt-1">
              vs {formatIndianCurrency(m.previous)}
            </span>
          </div>
        ))}
      </div>

      {/* Savings Rate comparison */}
      <div className="bg-[#FAF9FF] rounded-xl border border-[#eae6ff] p-3 flex items-center justify-between">
        <span className="text-xs text-[#475569] font-medium">Savings Rate</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9CA3AF]">{previous.savingsRate.toFixed(1)}%</span>
          <ArrowRight className="w-3 h-3 text-[#9CA3AF]" />
          <span className="text-sm font-bold text-[#8B5CF6]">{current.savingsRate.toFixed(1)}%</span>
          <ChangeBadge value={changes.savingsRateDiff} suffix="pp" />
        </div>
      </div>
    </div>
  )
}
