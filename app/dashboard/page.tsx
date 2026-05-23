'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Utensils, Car, ShoppingBag, Zap, Film, Heart, GraduationCap, Building, ShoppingCart, Sparkles, Briefcase, Wallet, Gift, CircleDot, TrendingUp, TrendingDown, PiggyBank, Eye, EyeOff, Lightbulb, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactions } from '@/lib/db'
import { getCategoryByName } from '@/lib/categories'
import { cn, formatIndianCurrency, formatIST, normalizeDateToYMD, getISTDateOffset } from '@/lib/utils'
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton'
import { Transaction } from '@/lib/types'

const categoryIcons: Record<string, React.ReactNode> = {
  'Food & Dining': <Utensils className="w-4 h-4" />,
  'Transport': <Car className="w-4 h-4" />,
  'Shopping': <ShoppingBag className="w-4 h-4" />,
  'Bills & Utilities': <Zap className="w-4 h-4" />,
  'Entertainment': <Film className="w-4 h-4" />,
  'Health': <Heart className="w-4 h-4" />,
  'Education': <GraduationCap className="w-4 h-4" />,
  'Rent': <Building className="w-4 h-4" />,
  'Groceries': <ShoppingCart className="w-4 h-4" />,
  'Personal Care': <Sparkles className="w-4 h-4" />,
  'Salary': <Wallet className="w-4 h-4" />,
  'Freelance': <Briefcase className="w-4 h-4" />,
  'Business': <Briefcase className="w-4 h-4" />,
  'Investment': <TrendingUp className="w-4 h-4" />,
  'Gift': <Gift className="w-4 h-4" />,
  'Other': <CircleDot className="w-4 h-4" />,
}

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [pieChartHeight, setPieChartHeight] = useState(250)
  const [isDesktop, setIsDesktop] = useState(false)
  const [dashboardView, setDashboardView] = useState<'month' | 'all'>('month')
  const [hideBalance, setHideBalance] = useState(false)

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

  if (loading) return <DashboardSkeleton />
  if (!mounted) return null

  // Current IST month prefix YYYY-MM
  const istNow = new Date().toLocaleString('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).slice(0, 7)

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpenses

  const recentTx = transactions.slice(0, 5)

  const thisMonthTx = transactions.filter(tx => {
    const ymd = normalizeDateToYMD(tx.date)
    return ymd.startsWith(istNow)
  })

  const monthIncome = thisMonthTx
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthExpenses = thisMonthTx
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthSavingsRate = monthIncome > 0
    ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100)
    : 0

  const allTimeSavingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
    : 0

  const thisMonthExpense = thisMonthTx
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

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

  const weeklyData = getLast7Days()

  const buildPieData = (expenseTxs: Transaction[], totalExpense: number) => {
    const totals: Record<string, number> = {}
    expenseTxs.forEach(tx => {
      const cat = getCategoryByName(tx.category)
      const catName = cat?.name || tx.category.trim()
      totals[catName] = (totals[catName] || 0) + Number(tx.amount)
    })
    return Object.entries(totals)
      .map(([catName, catAmount]) => {
        const cat = getCategoryByName(catName)
        return {
          name: catName,
          value: catAmount,
          color: cat?.color || '#6b7280',
          percentage: totalExpense > 0
            ? ((catAmount / totalExpense) * 100).toFixed(1)
            : '0.0',
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }

  const monthPieData = buildPieData(
    thisMonthTx.filter(tx => tx.type === 'expense'),
    thisMonthExpense
  )
  const allTimePieData = buildPieData(
    transactions.filter(tx => tx.type === 'expense'),
    totalExpenses
  )

  const pieData = dashboardView === 'month' ? monthPieData : allTimePieData
  const pieExpenseTotal = dashboardView === 'month' ? thisMonthExpense : totalExpenses

  // Derived values for new layout
  const displayIncome = dashboardView === 'month' ? monthIncome : totalIncome
  const displayExpense = dashboardView === 'month' ? monthExpenses : totalExpenses
  const displayBalance = dashboardView === 'month' ? monthIncome - monthExpenses : balance
  const displaySavingsRate = dashboardView === 'month' ? monthSavingsRate : allTimeSavingsRate
  const heroLabel = dashboardView === 'month' ? 'Current Balance' : 'Total Balance'
  const periodLabel = dashboardView === 'month' ? 'This Month' : 'All Time'

  // Relative time helper
  const getRelativeTime = (tx: Transaction): string => {
    if (!tx.created_at) return tx.date
    const dateStr = normalizeDateToYMD(tx.created_at)
    const today = getISTDateOffset(0)
    const yesterday = getISTDateOffset(1)
    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'
    return formatIST(tx.created_at)
  }

  // Weekly chart totals & outlier detection
  const weeklyIncomeTotal = weeklyData.reduce((s, d) => s + d.income, 0)
  const weeklyExpenseTotal = weeklyData.reduce((s, d) => s + d.expense, 0)
  const expenseValues = weeklyData.map(d => d.expense).filter(v => v > 0)
  const expenseAvg = expenseValues.length > 0 ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length : 0
  const expenseMax = Math.max(...weeklyData.map(d => d.expense), 0)
  const expenseCap = Math.ceil(expenseMax * 1.2)

  // Insight card data
  const topCategory = pieData.length > 0 ? pieData[0] : null
  const sparklinePoints = weeklyData.map((d, i) => {
    const maxE = Math.max(...weeklyData.map(w => w.expense), 1)
    const x = (i / 6) * 80
    const y = 38 - (d.expense / maxE) * 34
    return `${x},${y}`
  }).join(' ')

  // Custom outlier label for bar chart
  const OutlierLabel = (props: Record<string, unknown>) => {
    const { x, y, width, value, index } = props as { x: number; y: number; width: number; value: number; index: number }
    const isExpense = weeklyData[index]?.expense === value
    if (!isExpense || value <= 0 || expenseAvg <= 0 || value <= 2.5 * expenseAvg) return null
    return (
      <g>
        <rect x={x + width / 2 - 32} y={y - 22} width={64} height={18} rx={9} fill="#EF4444" />
        <text x={x + width / 2} y={y - 10} textAnchor="middle" fill="white" fontSize={10} fontWeight="600">
          High expense
        </text>
      </g>
    )
  }

  const formatAmount = (val: number) => hideBalance ? '\u2022\u2022\u2022\u2022\u2022\u2022' : formatIndianCurrency(val)

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* 1. Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0F172A]">Dashboard</h1>
          <div className="flex items-center bg-white border border-[#E2E8F0] rounded-full p-0.5">
            <button
              onClick={() => setDashboardView('month')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                dashboardView === 'month'
                  ? "bg-[#0A7B7B] text-white"
                  : "bg-white text-[#475569]"
              )}
            >
              This Month
            </button>
            <button
              onClick={() => setDashboardView('all')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                dashboardView === 'all'
                  ? "bg-[#0A7B7B] text-white"
                  : "bg-white text-[#475569]"
              )}
            >
              All Time
            </button>
          </div>
        </div>

        {/* 2. Hero Card */}
        <div className="bg-gradient-to-br from-[#0A7B7B] to-[#0D5C5C] rounded-2xl p-5 md:p-6 shadow-lg overflow-hidden relative">
          <svg className="absolute right-0 top-0 h-full w-48 opacity-10 pointer-events-none" viewBox="0 0 200 200" preserveAspectRatio="none">
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
            displayBalance < 0 && "text-red-300"
          )}>
            {formatAmount(displayBalance)}
          </p>
          <p className="text-white/70 text-xs mt-1">{periodLabel}</p>
        </div>

        {/* 3. Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Income */}
          <div className="bg-gradient-to-b from-[#f4fbf7] to-white border border-[#e2f5ec] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col items-center text-center">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mb-2 bg-[#10B981]/10">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#10B981]" />
            </div>
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium">Income</span>
            <span className="text-xs sm:text-sm font-bold text-[#0F172A]">{formatIndianCurrency(displayIncome)}</span>
          </div>
          {/* Expenses */}
          <div className="bg-gradient-to-b from-[#fff5f5] to-white border border-[#ffe1e1] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col items-center text-center">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mb-2 bg-[#EF4444]/10">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EF4444]" />
            </div>
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium">Expenses</span>
            <span className="text-xs sm:text-sm font-bold text-[#0F172A]">{formatIndianCurrency(displayExpense)}</span>
          </div>
          {/* Saved */}
          <div className="bg-gradient-to-b from-[#FAF9FF] to-white border border-[#eae6ff] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col items-center text-center">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mb-2 bg-[#7C3AED]/10">
              <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7C3AED]" />
            </div>
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium">Saved</span>
            <span className="text-xs sm:text-sm font-bold text-[#7C3AED]">{formatIndianCurrency(displayIncome - displayExpense)}</span>
            <span className="mt-1 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED]">{displaySavingsRate}%</span>
          </div>
        </div>

        {/* 4. Insight Card */}
        {topCategory && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#0A7B7B]/10 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-[#0A7B7B]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#0A7B7B] text-sm font-semibold">This Month Insight</p>
              <p className="text-base font-semibold text-[#0F172A]">{topCategory.name}</p>
              <p className="text-[#475569] text-sm">You spent {formatIndianCurrency(topCategory.value)} so far</p>
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
          </div>
        )}

        {/* 5. Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#0F172A]">Recent Transactions</h2>
            <button
              onClick={() => router.push('/history')}
              className="text-[#0A7B7B] text-sm font-medium hover:underline"
            >
              View All →
            </button>
          </div>
          {recentTx.length === 0 ? (
            <div className="p-8 text-center text-[#64748B]">
              <p>No transactions yet</p>
              <p className="text-sm">Start tracking your finances</p>
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
                      i < recentTx.length - 1 && "border-b border-[#E2E8F0]"
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
                      <p className="font-semibold text-[#0F172A] text-sm truncate">{tx.note || tx.category}</p>
                      <p className="text-xs text-[#475569]">{cat?.name} • {getRelativeTime(tx)}</p>
                    </div>
                    <p className={cn(
                      "font-bold text-sm flex-shrink-0",
                      tx.type === 'income' ? "text-[#10B981]" : "text-[#EF4444]"
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
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#0F172A]">Weekly Activity</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0A7B7B]" />
                <span className="text-[#475569]">{formatIndianCurrency(weeklyIncomeTotal)}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-[#475569]">{formatIndianCurrency(weeklyExpenseTotal)}</span>
              </span>
            </div>
          </div>
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData || []} margin={{ top: 20, right: 5, left: 5, bottom: 5 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} domain={[0, expenseCap]} />
                <Tooltip
                  formatter={(value, name) => [formatIndianCurrency(Number(value)), name]}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  verticalAlign="bottom"
                  align="center"
                />
                <Bar dataKey="income" name="Income" fill="#0A7B7B" barSize={22} radius={[4, 4, 0, 0]} minPointSize={3} />
                <Bar dataKey="expense" name="Expense" fill="#EF4444" barSize={22} radius={[4, 4, 0, 0]} minPointSize={3} label={<OutlierLabel />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. Expense Breakdown */}
        {pieExpenseTotal > 0 && pieData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4 md:p-5">
            <h2 className="text-base font-semibold text-[#0F172A]">Expense Breakdown</h2>
            <p className="text-xs text-[#64748B] mb-3">
              {dashboardView === 'month' ? 'This month by category' : 'All time by category'}
            </p>
            <div className={cn("flex items-center gap-4", isDesktop ? "flex-row" : "flex-col")}>
              <div className="relative flex-shrink-0" style={{ height: pieChartHeight, width: isDesktop ? pieChartHeight : '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatIndianCurrency(Number(value))}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm md:text-base font-bold text-[#0F172A]">{formatIndianCurrency(pieExpenseTotal)}</span>
                  <span className="text-[10px] md:text-xs text-[#64748B]">Spent</span>
                </div>
              </div>
              <div className="flex-1 w-full space-y-2">
                {pieData.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs md:text-sm text-[#0F172A] truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs md:text-sm font-semibold text-[#0F172A]">{formatIndianCurrency(cat.value)}</span>
                      <span className="text-[10px] text-[#64748B] w-10 text-right">{cat.percentage}%</span>
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
