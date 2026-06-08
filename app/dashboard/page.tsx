'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Utensils, Car, ShoppingBag, Zap, Film, Heart, GraduationCap, Building, ShoppingCart, Sparkles, Briefcase, Wallet, Gift, CircleDot, TrendingUp, TrendingDown, PiggyBank, Eye, EyeOff, Lightbulb, ChevronRight } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { TooltipProps } from 'recharts'
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactions } from '@/lib/db'
import { getCategoryByName } from '@/lib/categories'
import { cn, formatIndianCurrency, formatIST, normalizeDateToYMD, getISTDateOffset } from '@/lib/utils'
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton'
import { Transaction } from '@/lib/types'

// ── Category icons ────────────────────────────────────────────────────────────
const categoryIcons: Record<string, React.ReactNode> = {
  'Food & Dining':   <Utensils   className="w-4 h-4" />,
  'Transport':       <Car        className="w-4 h-4" />,
  'Shopping':        <ShoppingBag className="w-4 h-4" />,
  'Bills & Utilities': <Zap      className="w-4 h-4" />,
  'Entertainment':   <Film       className="w-4 h-4" />,
  'Health':          <Heart      className="w-4 h-4" />,
  'Education':       <GraduationCap className="w-4 h-4" />,
  'Rent':            <Building   className="w-4 h-4" />,
  'Groceries':       <ShoppingCart className="w-4 h-4" />,
  'Personal Care':   <Sparkles   className="w-4 h-4" />,
  'Salary':          <Wallet     className="w-4 h-4" />,
  'Freelance':       <Briefcase  className="w-4 h-4" />,
  'Business':        <Briefcase  className="w-4 h-4" />,
  'Investment':      <TrendingUp className="w-4 h-4" />,
  'Gift':            <Gift       className="w-4 h-4" />,
  'Other':           <CircleDot  className="w-4 h-4" />,
}

// ── Custom Tooltip (defined OUTSIDE component — Fix #1 & #3) ─────────────────
const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) => {
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

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const [mounted, setMounted]           = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [pieChartHeight, setPieChartHeight] = useState(250)
  const [isDesktop, setIsDesktop]       = useState(false)
  const [dashboardView, setDashboardView] = useState<'month' | 'all'>('month')
  const [hideBalance, setHideBalance]   = useState(false)

  // ── Data fetching ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const data = await getTransactions()
      setTransactions(data)
      setLoading(false)
      setMounted(true)
    }
    load()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        getTransactions().then(data => setTransactions(data))
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // ── Responsive pie chart height ──────────────────────────────────────────
  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth
      if (w >= 1024) {
        setPieChartHeight(380)
        setIsDesktop(true)
      } else if (w >= 768) {
        setPieChartHeight(320)
        setIsDesktop(false)
      } else {
        setPieChartHeight(250)
        setIsDesktop(false)
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  if (loading)  return <DashboardSkeleton />
  if (!mounted) return null

  // ── IST month prefix YYYY-MM ─────────────────────────────────────────────
  const istNow = new Date()
    .toLocaleString('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
    })
    .slice(0, 7)

  // ── All-time aggregates ──────────────────────────────────────────────────
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpenses

  // ── Recent transactions ──────────────────────────────────────────────────
  const recentTx = transactions.slice(0, 5)

  // ── This-month aggregates ────────────────────────────────────────────────
  const thisMonthTx = transactions.filter(tx =>
    normalizeDateToYMD(tx.date).startsWith(istNow)
  )

  const monthIncome = thisMonthTx
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthExpenses = thisMonthTx
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const thisMonthExpense = monthExpenses   // alias used by pie data

  const monthSavingsRate = monthIncome > 0
    ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100)
    : 0

  const allTimeSavingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
    : 0

  // ── Weekly chart data ────────────────────────────────────────────────────
  const getLast7Days = () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const dateYMD = getISTDateOffset(i)
      const dayName = new Date(dateYMD + 'T00:00:00')
        .toLocaleDateString('en', { weekday: 'short' })

      const dayIncome = transactions
        .filter(t => t.type === 'income' && normalizeDateToYMD(t.date) === dateYMD)
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const dayExpense = transactions
        .filter(t => t.type === 'expense' && normalizeDateToYMD(t.date) === dateYMD)
        .reduce((sum, t) => sum + Number(t.amount), 0)

      days.push({ day: dayName, income: dayIncome, expense: dayExpense })
    }
    return days
  }

  const weeklyData         = getLast7Days()
  const weeklyIncomeTotal  = weeklyData.reduce((s, d) => s + d.income,  0)
  const weeklyExpenseTotal = weeklyData.reduce((s, d) => s + d.expense, 0)

  // ── Pie chart data ───────────────────────────────────────────────────────
  const buildPieData = (expenseTxs: Transaction[], totalExpense: number) => {
    const totals: Record<string, number> = {}
    expenseTxs.forEach(tx => {
      const cat    = getCategoryByName(tx.category)
      const catName = cat?.name || tx.category.trim()
      totals[catName] = (totals[catName] || 0) + Number(tx.amount)
    })
    return Object.entries(totals)
      .map(([catName, catAmount]) => {
        const cat = getCategoryByName(catName)
        return {
          name:       catName,
          value:      catAmount,
          color:      cat?.color || '#6b7280',
          percentage: totalExpense > 0
            ? ((catAmount / totalExpense) * 100).toFixed(1)
            : '0.0',
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }

  const monthPieData   = buildPieData(
    thisMonthTx.filter(tx => tx.type === 'expense'),
    thisMonthExpense,
  )
  const allTimePieData = buildPieData(
    transactions.filter(tx => tx.type === 'expense'),
    totalExpenses,
  )

  const pieData         = dashboardView === 'month' ? monthPieData   : allTimePieData
  const pieExpenseTotal = dashboardView === 'month' ? thisMonthExpense : totalExpenses

  // ── Display-mode derived values ──────────────────────────────────────────
  const displayIncome      = dashboardView === 'month' ? monthIncome              : totalIncome
  const displayExpense     = dashboardView === 'month' ? monthExpenses            : totalExpenses
  const displayBalance     = dashboardView === 'month' ? monthIncome - monthExpenses : balance
  const displaySavingsRate = dashboardView === 'month' ? monthSavingsRate         : allTimeSavingsRate
  const heroLabel          = dashboardView === 'month' ? t('currentBalance')      : t('totalBalance')
  const periodLabel        = dashboardView === 'month' ? t('thisMonth')           : t('allTime')

  // Fix #5: dynamic insight card title
  const insightLabel = dashboardView === 'month' ? t('thisMonthInsight') : t('allTimeInsight')

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getRelativeTime = (tx: Transaction): string => {
    if (!tx.created_at) return tx.date
    const dateStr   = normalizeDateToYMD(tx.created_at)
    const today     = getISTDateOffset(0)
    const yesterday = getISTDateOffset(1)
    if (dateStr === today)     return t('today')
    if (dateStr === yesterday) return t('yesterday')
    return formatIST(tx.created_at)
  }

  const topCategory = pieData.length > 0 ? pieData[0] : null

  const sparklinePoints = weeklyData.map((d, i) => {
    const maxE = Math.max(...weeklyData.map(w => w.expense), 1)
    const x = (i / 6) * 80
    const y = 38 - (d.expense / maxE) * 34
    return `${x},${y}`
  }).join(' ')

  const formatAmount = (val: number) =>
    hideBalance ? '••••••' : formatIndianCurrency(val)

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">

        {/* 1. Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0F172A]">{t('dashboard')}</h1>
          <div className="flex items-center bg-white border border-[#E2E8F0] rounded-full p-0.5">
            <button
              onClick={() => setDashboardView('month')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                dashboardView === 'month' ? "bg-[#0A7B7B] text-white" : "bg-white text-[#475569]",
              )}
            >
              {t('thisMonth')}
            </button>
            <button
              onClick={() => setDashboardView('all')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                dashboardView === 'all' ? "bg-[#0A7B7B] text-white" : "bg-white text-[#475569]",
              )}
            >
              {t('allTime')}
            </button>
          </div>
        </div>

        {/* 2. Hero Card */}
        <div className="bg-gradient-to-br from-[#0A7B7B] to-[#0D5C5C] rounded-2xl p-5 md:p-6 shadow-lg overflow-hidden relative">
          <svg
            className="absolute right-0 top-0 h-full w-48 opacity-10 pointer-events-none"
            viewBox="0 0 200 200"
            preserveAspectRatio="none"
          >
            <path d="M0,100 Q50,10 100,80 T200,60 L200,200 L0,200 Z" fill="white" />
          </svg>
          <div className="relative flex items-start justify-between">
            <p className="text-white/80 text-sm">{heroLabel}</p>
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="text-white/70 hover:text-white transition-colors"
            >
              {hideBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className={cn(
            "text-4xl font-bold text-white tracking-tight mt-2",
            displayBalance < 0 && "text-red-300",
          )}>
            {formatAmount(displayBalance)}
          </p>
          <p className="text-white/70 text-xs mt-1">{periodLabel}</p>
        </div>

        {/* 3. Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 items-stretch">
          {/* Income */}
          <div className="bg-gradient-to-b from-[#f4fbf7] to-white border border-[#e2f5ec] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between h-full items-center text-center">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mb-2 bg-[#10B981]/10">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#10B981]" />
            </div>
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium">{t('income')}</span>
            <span className="text-xs sm:text-sm font-bold text-[#0F172A]">
              {formatIndianCurrency(displayIncome)}
            </span>
          </div>
          {/* Expenses */}
          <div className="bg-gradient-to-b from-[#fff5f5] to-white border border-[#ffe1e1] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between h-full items-center text-center">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mb-2 bg-[#EF4444]/10">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EF4444]" />
            </div>
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium">{t('expense')}</span>
            <span className="text-xs sm:text-sm font-bold text-[#0F172A]">
              {formatIndianCurrency(displayExpense)}
            </span>
          </div>
          {/* Saving */}
          <div className="bg-gradient-to-b from-[#FAF9FF] to-white border border-[#eae6ff] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between h-full items-center text-center">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mb-2 bg-[#7C3AED]/10">
              <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7C3AED]" />
            </div>
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium">{t('saving')}</span>
            <span className={cn(
              "text-sm font-bold rounded-full px-2 py-0.5",
              displaySavingsRate >= 0 ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-red-100 text-red-600",
            )}>
              {displaySavingsRate}%
            </span>
          </div>
        </div>

        {/* 4. Insight Card — Fix #5: title reflects dashboardView */}
        {topCategory && (
          <button
            type="button"
            onClick={() => router.push('/insights')}
            className="w-full bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#0A7B7B]/10 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-[#0A7B7B]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#0A7B7B] text-sm font-semibold">{insightLabel}</p>
              <p className="text-base font-semibold text-[#0F172A]">{topCategory.name}</p>
              <p className="text-[#475569] text-sm">
                {t('youSpentXSoFar').replace('{amount}', formatIndianCurrency(topCategory.value))}
              </p>
            </div>
            <div className="flex-shrink-0 hidden sm:block">
              <svg width="80" height="40" viewBox="0 0 80 40">
                <polyline
                  fill="none"
                  stroke="#0A7B7B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparklinePoints}
                />
              </svg>
            </div>
            <ChevronRight className="w-5 h-5 text-[#64748B] flex-shrink-0" />
          </button>
        )}

        {/* 5. Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#0F172A]">{t('recentTransactions')}</h2>
            <button
              onClick={() => router.push('/history')}
              className="text-[#0A7B7B] text-sm font-medium hover:underline"
            >
              {t('viewAll')} →
            </button>
          </div>
          {recentTx.length === 0 ? (
            <div className="p-8 text-center text-[#64748B]">
              <p>{t('noTransactions')}</p>
              <p className="text-sm">{t('startTracking')}</p>
            </div>
          ) : (
            <div>
              {recentTx.map((tx, i) => {
                const cat = getCategoryByName(tx.category)
                return (
                  <button
                    key={tx.id}
                    onClick={() => router.push(`/transaction/${tx.id}`)}
                    className={cn(
                      "w-full flex items-center gap-3 py-3 hover:bg-gray-50 transition-colors",
                      i < recentTx.length - 1 && "border-b border-[#E2E8F0]",
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${cat?.color}20` }}
                    >
                      <span style={{ color: cat?.color }}>
                        {categoryIcons[tx.category] || categoryIcons['Other']}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-[#0F172A] text-sm truncate">
                        {tx.note || tx.category}
                      </p>
                      <p className="text-xs text-[#475569]">
                        {cat?.name} • {getRelativeTime(tx)}
                      </p>
                    </div>
                    <p className={cn(
                      "font-bold text-sm flex-shrink-0",
                      tx.type === 'income' ? "text-[#10B981]" : "text-[#EF4444]",
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatIndianCurrency(Number(tx.amount))}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 6. Weekly Activity Chart */}
        <div className="bg-white rounded-[28px] shadow-[0_10px_40px_rgba(15,23,42,0.06)] border border-[#EEF2F7] p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">{t('weeklyActivity')}</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {t('weeklyActivityDesc')}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00B894] shadow-[0_0_8px_rgba(0,184,148,0.5)]" />
                <div>
                  <span className="text-[#64748B] block text-[10px] uppercase tracking-wider font-semibold">
                    {t('income')}
                  </span>
                  <span className="text-[#0F172A] font-bold text-sm">
                    {formatIndianCurrency(weeklyIncomeTotal)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A5F] shadow-[0_0_8px_rgba(255,90,95,0.5)]" />
                <div>
                  <span className="text-[#64748B] block text-[10px] uppercase tracking-wider font-semibold">
                    {t('expense')}
                  </span>
                  <span className="text-[#0F172A] font-bold text-sm">
                    {formatIndianCurrency(weeklyExpenseTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[220px] sm:h-[260px] md:h-[340px] mt-6 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* Fix #1: removed redundant `weeklyData || []` */}
              <AreaChart data={weeklyData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00B894" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00B894" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF5A5F" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FF5A5F" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                {/* Fix #2: tickFormatter returns string, not number */}
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
                <Area
                  type="monotone"
                  dataKey="income"
                  name={t('income')}
                  stroke="#00B894"
                  strokeWidth={3}
                  fill="url(#incomeGradient)"
                  dot={false}
                  activeDot={{ r: 6, stroke: '#00B894', strokeWidth: 4, fill: '#FFFFFF' }}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name={t('expense')}
                  stroke="#FF5A5F"
                  strokeWidth={3}
                  fill="url(#expenseGradient)"
                  dot={false}
                  activeDot={{ r: 6, stroke: '#FF5A5F', strokeWidth: 4, fill: '#FFFFFF' }}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. Expense Breakdown */}
        {pieExpenseTotal > 0 && pieData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 md:p-5">
            <h2 className="text-base font-semibold text-[#0F172A]">{t('expenseBreakdown')}</h2>
            <p className="text-xs text-[#64748B] mb-3">
              {dashboardView === 'month' ? t('thisMonthByCategory') : t('allTimeByCategory')}
            </p>
            <div className={cn("flex items-center gap-4", isDesktop ? "flex-row" : "flex-col")}>
              <div
                className="relative flex-shrink-0"
                style={{ height: pieChartHeight, width: isDesktop ? pieChartHeight : '100%' }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatIndianCurrency(Number(value))}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm md:text-base font-bold text-[#0F172A]">
                    {formatIndianCurrency(pieExpenseTotal)}
                  </span>
                  <span className="text-[10px] md:text-xs text-[#64748B]">{t('spent')}</span>
                </div>
              </div>
              <div className="flex-1 w-full space-y-2">
                {pieData.map((cat, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs md:text-sm text-[#0F172A] truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs md:text-sm font-semibold text-[#0F172A]">
                        {formatIndianCurrency(cat.value)}
                      </span>
                      <span className="text-[10px] text-[#64748B] w-10 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
