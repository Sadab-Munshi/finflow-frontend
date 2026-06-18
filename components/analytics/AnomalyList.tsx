'use client'

import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { formatIndianCurrency } from '@/lib/utils'
import type { AnomalyTransaction } from '@/lib/analytics-types'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AnomalyList({ data }: { data: AnomalyTransaction[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[#F0FDF9] flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-[#10B981]" />
        </div>
        <p className="text-sm font-medium text-[#0F172A]">No anomalies detected</p>
        <p className="text-xs text-[#9CA3AF] mt-1">Your spending patterns look consistent</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#64748B] mb-3">
        {data.length} unusual transaction{data.length > 1 ? 's' : ''} detected using Z-score analysis
      </p>
      {data.map((tx) => {
        const isHigh = tx.direction === 'high'
        return (
          <div
            key={tx.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#FAFAFA] hover:bg-[#F5F5F5] transition-colors"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                isHigh ? 'bg-red-50' : 'bg-green-50'
              }`}
            >
              {isHigh ? (
                <TrendingUp className="w-4 h-4 text-[#EF4444]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#10B981]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#0F172A] truncate">
                  {tx.note || tx.category}
                </p>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    isHigh
                      ? 'bg-red-50 text-[#EF4444]'
                      : 'bg-green-50 text-[#10B981]'
                  }`}
                >
                  Z={Math.abs(tx.zScore).toFixed(1)}
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                {tx.category} · {formatDate(tx.date)}
              </p>
            </div>
            <p
              className={`text-sm font-bold flex-shrink-0 ${
                isHigh ? 'text-[#EF4444]' : 'text-[#10B981]'
              }`}
            >
              {isHigh ? '+' : '-'}{formatIndianCurrency(tx.amount)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
