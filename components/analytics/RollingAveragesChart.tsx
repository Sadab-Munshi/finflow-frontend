'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TooltipProps } from 'recharts'
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { formatIndianCurrency } from '@/lib/utils'
import type { RollingAveragePoint } from '@/lib/analytics-types'

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#EEF2F7] min-w-[140px]">
        <p className="text-xs font-bold text-[#64748B] mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#475569]">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: (entry.stroke as string) || (entry.color as string) }}
                />
                {entry.name}
              </span>
              <span className="text-xs font-bold text-[#0F172A]">
                {formatIndianCurrency(Number(entry.value))}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function RollingAveragesChart({ data }: { data: RollingAveragePoint[] }) {
  // Show last 90 days max for readability
  const chartData = data.slice(-90).map(point => ({
    ...point,
    label: formatDate(point.date),
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-[#9CA3AF] text-sm">
        Not enough data to display trends
      </div>
    )
  }

  return (
    <div className="h-[280px] sm:h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="sma7Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0A7B7B" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#0A7B7B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
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
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
          />
          <Line
            type="monotone"
            dataKey="dailySpend"
            name="Daily Spend"
            stroke="#CBD5E1"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, stroke: '#CBD5E1', strokeWidth: 2, fill: '#FFFFFF' }}
          />
          <Line
            type="monotone"
            dataKey="sma7"
            name="7-day Avg"
            stroke="#0A7B7B"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, stroke: '#0A7B7B', strokeWidth: 3, fill: '#FFFFFF' }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="sma30"
            name="30-day Avg"
            stroke="#8B5CF6"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, stroke: '#8B5CF6', strokeWidth: 3, fill: '#FFFFFF' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
