'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { TooltipProps } from 'recharts'
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { formatIndianCurrency } from '@/lib/utils'
import type { SeasonalityDay } from '@/lib/analytics-types'

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const entry = payload[0]
    const ratio = entry.payload?.ratio as number
    const label = ratio > 1.1 ? 'Above average' : ratio < 0.9 ? 'Below average' : 'Average'
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#EEF2F7]">
        <p className="text-xs font-bold text-[#64748B] mb-1">{entry.payload?.day}</p>
        <p className="text-sm font-bold text-[#0F172A]">{formatIndianCurrency(Number(entry.value))}</p>
        <p className="text-[10px] text-[#9CA3AF] mt-1">{label} ({(ratio * 100).toFixed(0)}%)</p>
      </div>
    )
  }
  return null
}

function getBarColor(ratio: number): string {
  if (ratio >= 1.2) return '#EF4444'
  if (ratio >= 1.0) return '#F59E0B'
  if (ratio >= 0.8) return '#0A7B7B'
  return '#10B981'
}

export default function SeasonalityChart({ data }: { data: SeasonalityDay[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-[#9CA3AF] text-sm">
        Not enough data for seasonality analysis
      </div>
    )
  }

  return (
    <div className="h-[280px] sm:h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val: string) => val.slice(0, 3)}
            dy={8}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)
            }
            dx={-8}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(10,123,123,0.04)' }} />
          <ReferenceLine
            y={data[0]?.overallAverage || 0}
            stroke="#94A3B8"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: 'Avg',
              position: 'right',
              fill: '#94A3B8',
              fontSize: 10,
              fontWeight: 600,
            }}
          />
          <Bar dataKey="averageSpend" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.ratio)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
