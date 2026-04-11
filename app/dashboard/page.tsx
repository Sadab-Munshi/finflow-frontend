'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Camera, PenLine, FileUp, Utensils, Car, ShoppingBag, Zap, Film, Heart, GraduationCap, Building, ShoppingCart, Sparkles, Briefcase, Wallet, Gift, CircleDot, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactions } from '@/lib/db'
import { getCategoryByName } from '@/lib/categories'
import { cn, formatIndianCurrency, getStartOfMonth, getEndOfMonth, isDateInRange, formatIST, normalizeDateToYMD, getISTDateOffset } from '@/lib/utils'
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

// Normalize any date format to YYYY-MM-DD in IST
function normalizeDateToYMD(dateStr: string): string {
  if (!dateStr) return ''
  if (dateStr.includes('T') || dateStr.includes('Z')) {
    // ISO string — convert to IST date
    const ist = new Date(dateStr).toLocaleString('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    // en-CA returns YYYY-MM-DD
    return ist
  }
  if (dateStr.includes('/')) {
    // DD/MM/YYYY → YYYY-MM-DD
    const [d, m, y] = dateStr.split('/')
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Already YYYY-MM-DD
  return dateStr
}

// Get YYYY-MM-DD for IST "today - i days"
function getISTDateOffset(daysAgo: number): string {
  const now = new Date()
  now.setDate(now.getDate() - daysAgo)
  return now.toLocaleString('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [pieChartHeight, setPieChartHeight] = useState(250)
  const [isDesktop, setIsDesktop] = useState(false)
  const [balanceView, setBalanceView] = useState<'month' | 'all'>('month')

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
  }).slice(0, 7) // "YYYY-MM"

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpenses

  // Recent 5 transactions (already sorted newest first from DB)
  const recentTx = transactions.slice(0, 5)

  // This month transactions — normalize date for comparison
  const thisMonthTx = transactions.filter(tx => {
    const ymd = normalizeDateToYMD(tx.date)
    return ymd.startsWith(istNow)
  })

  // This month income/expense/savings for the stats cards
  const monthIncome = thisMonthTx
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthExpenses = thisMonthTx
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthSavingsRate = monthIncome > 0
    ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100)
    : 0

  const thisMonthExpense = thisMonthTx
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  // ✅ Fixed: compare normalized dates in IST
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

  // Pie chart — this month expenses by category
  const categoryTotals: Record<string, number> = {}
  thisMonthTx
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      const cat = getCategoryByName(tx.category)
      const catName = cat?.name || tx.category.trim()
      categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(tx.amount)
    })

  const pieData = Object.entries(categoryTotals)
    .map(([catName, catAmount]) => {
      const cat = getCategoryByName(catName)
      return {
        name: catName,
        value: catAmount,
        color: cat?.color || '#6b7280',
        percentage: thisMonthExpense > 0
          ? ((catAmount / thisMonthExpense) * 100).toFixed(1)
          : '0.0',
      }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">{t('dashboard')}</h1>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white border-0 shadow-xl overflow-hidden relative">
          <CardContent className="p-4 md:p-6 relative">
            <div className="flex items-center justify-between">
              <p className="text-teal-200 text-xs md:text-sm font-medium">{t('totalBalance')}</p>
              <div className="flex bg-white/15 rounded-full p-0.5">
                <button
                  onClick={() => setBalanceView('month')}
                  className={cn(
                    "text-[10px] md:text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors",
                    balanceView === 'month'
                      ? "bg-white text-teal-700"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  This Month
                </button>
                <button
                  onClick={() => setBalanceView('all')}
                  className={cn(
                    "text-[10px] md:text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors",
                    balanceView === 'all'
                      ? "bg-white text-teal-700"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  All Time
                </button>
              </div>
            </div>
            <p className={cn(
              "text-2xl md:text-4xl font-bold mt-1 md:mt-2 tracking-tight",
              (balanceView === 'month' ? monthIncome - monthExpenses : balance) >= 0 ? "text-white" : "text-red-300"
            )}>
              {formatIndianCurrency(balanceView === 'month' ? monthIncome - monthExpenses : balance)}
            </p>
            <p className="text-white/70 text-xs mt-1">{balanceView === 'month' ? 'This month' : 'All time'}</p>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          {/* Income Card */}
          <div className="rounded-2xl shadow-sm p-3 flex flex-col items-center text-center bg-white">
            <span className="text-xs text-gray-500 mb-0.5">Income</span>
            <span className="text-[10px] text-gray-400 mb-1">This Month</span>
            <span className="text-sm font-bold text-green-600">₹{monthIncome.toLocaleString('en-IN')}</span>
          </div>
          {/* Expense Card */}
          <div className="rounded-2xl shadow-sm p-3 flex flex-col items-center text-center bg-white">
            <span className="text-xs text-gray-500 mb-0.5">Expense</span>
            <span className="text-[10px] text-gray-400 mb-1">This Month</span>
            <span className="text-sm font-bold text-red-500">₹{monthExpenses.toLocaleString('en-IN')}</span>
          </div>
          {/* Savings Card */}
          <div className="rounded-2xl shadow-sm p-3 flex flex-col items-center text-center bg-white">
            <span className="text-xs text-gray-500 mb-0.5">Savings</span>
            <span className="text-[10px] text-gray-400 mb-1">This Month</span>
            <span className={cn(
              "text-sm font-bold",
              monthSavingsRate >= 0 ? "text-green-600" : "text-red-500"
            )}>{monthSavingsRate}%</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          {[
            { icon: Mic, label: t('voice'), tab: 'voice', color: '#9333EA', bg: '#F3E8FF' },
            { icon: Camera, label: t('scan'), tab: 'scan', color: '#2563EB', bg: '#DBEAFE' },
            { icon: PenLine, label: t('manual'), tab: 'manual', color: '#16A34A', bg: '#DCFCE7' },
            { icon: Sparkles, label: 'AI Add', tab: 'text', color: '#F6546A', bg: '#FEEDF0' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(`/add?tab=${action.tab}`)}
              className="flex flex-col items-center gap-1.5 p-2.5 md:p-4 rounded-xl bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-gray-100"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: action.bg }}>
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <span className="text-[10px] md:text-xs text-gray-600 font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Weekly Activity Chart */}
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg text-gray-800">{t('weeklyActivity')}</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData || []} margin={{ top: 5, right: 5, left: 5, bottom: 5 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value, name) => [formatIndianCurrency(Number(value)), name]}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="income" name={t('income')} fill="#0D9488" barSize={22} radius={[4, 4, 0, 0]} minPointSize={3} />
                  <Bar dataKey="expense" name={t('expense')} fill="#F43F5E" barSize={22} radius={[4, 4, 0, 0]} minPointSize={3} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie */}
        {thisMonthExpense > 0 && pieData.length > 0 && (
          <Card className="border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg text-gray-800">Expense Breakdown</CardTitle>
              <CardDescription className="text-xs text-gray-500">This month by category</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
              <div className={cn("flex items-center gap-4", isDesktop ? "flex-row" : "flex-col")}>
                <div className="relative flex-shrink-0" style={{ height: pieChartHeight, width: isDesktop ? pieChartHeight : '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={pieChartHeight * 0.22} outerRadius={pieChartHeight * 0.38}
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
                    <span className="text-sm md:text-base font-bold text-gray-800">{formatIndianCurrency(thisMonthExpense)}</span>
                    <span className="text-[10px] md:text-xs text-gray-400">Spent</span>
                  </div>
                </div>
                <div className="flex-1 w-full space-y-2">
                  {pieData.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs md:text-sm text-gray-700 truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs md:text-sm font-semibold text-gray-800">{formatIndianCurrency(cat.value)}</span>
                        <span className="text-[10px] text-gray-400 w-10 text-right">{cat.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-lg text-gray-800">{t('recentTransactions')}</CardTitle>
              <button
                onClick={() => router.push('/history')}
                className="text-teal-600 text-sm font-medium hover:underline"
              >
                {t('viewAll')}
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentTx.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>{t('noTransactions')}</p>
                <p className="text-sm">{t('startTracking')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTx.map(tx => {
                  const cat = getCategoryByName(tx.category)
                  return (
                    <button
                      key={tx.id}
                      onClick={() => router.push(`/transaction/${tx.id}`)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${cat?.color}20` }}
                      >
                        <span style={{ color: cat?.color }}>
                          {categoryIcons[tx.category] || categoryIcons['Other']}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-gray-800 text-sm truncate">{tx.note || tx.category}</p>
                        <p className="text-xs text-gray-500">
                          {tx.created_at ? formatIST(tx.created_at) : tx.date} · {cat?.name}
                        </p>
                      </div>
                      <p className={cn(
                        "font-bold text-sm flex-shrink-0",
                        tx.type === 'income' ? "text-green-600" : "text-rose-600"
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatIndianCurrency(Number(tx.amount))}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </Layout>
  )
}
