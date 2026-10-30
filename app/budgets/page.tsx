'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, X, Loader2,
  ChevronLeft, ChevronRight, Wallet,
  Utensils, Car, ShoppingBag, Zap, Film, Heart,
  GraduationCap, Building, ShoppingCart, Sparkles,
  Briefcase, Gift, CircleDot, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownLeft,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { useTranslations } from 'next-intl'
import { getTransactions, getBudgets, saveBudget, updateBudget, deleteBudget } from '@/lib/db'
import { getExpenseCategories, getCategoryByName } from '@/lib/categories'
import { formatIndianCurrency, normalizeDateToYMD } from '@/lib/utils'
import BudgetsSkeleton from '@/components/skeletons/BudgetsSkeleton'
import { Budget, Transaction } from '@/lib/types'

/* ── Helpers & constants ───────────────────────────────────────────── */

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const formatMonthLabel = (m: string) => {
  const [y, mo] = m.split('-')
  const idx = parseInt(mo) - 1
  return `${MONTH_NAMES[idx] ?? mo} ${y}`
}

const formatMonthShort = (m: string) => {
  const [y, mo] = m.split('-')
  const idx = parseInt(mo) - 1
  const name = MONTH_NAMES[idx]
  return `${name ? name.slice(0, 3) : mo} ${y}`
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function mk(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}`
}

const categoryIconMap: Record<string, typeof Utensils> = {
  'Food & Dining': Utensils,
  'Transport': Car,
  'Shopping': ShoppingBag,
  'Bills & Utilities': Zap,
  'Entertainment': Film,
  'Health': Heart,
  'Education': GraduationCap,
  'Rent': Building,
  'Groceries': ShoppingCart,
  'Personal Care': Sparkles,
  'Salary': Wallet,
  'Freelance': Briefcase,
  'Business': Briefcase,
  'Investment': TrendingUp,
  'Money Sent': ArrowUpRight,
  'Money Received': ArrowDownLeft,
  'Gift': Gift,
  'Other': CircleDot,
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000]

/* Status helpers */


/* Icon background tint from category color */

/* ── Component ─────────────────────────────────────────────────────── */

export default function BudgetsPage() {
  const t = useTranslations('budgets')

  /* data state */
  const [mounted, setMounted]           = useState(false)
  const [budgets, setBudgets]           = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [earliestBudgetMonth, setEarliestBudgetMonth] = useState<string | null>(null)

  /* modal state */
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [category, setCategory]         = useState('')
  const [amount, setAmount]             = useState('')
  const [month, setMonth]               = useState(getCurrentMonth())
  const [saving, setSaving]             = useState(false)

  /* delete state */
  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  /* ── Data loading ───────────────────────────────────────────────── */

  const loadData = async () => {
    setLoading(true)
    const [budgetsData, transactionsData] = await Promise.all([
      getBudgets(),
      getTransactions(),
    ])
    setBudgets(budgetsData)
    setTransactions(transactionsData)
    if (budgetsData.length > 0) {
      const earliest = budgetsData.reduce(
        (min, b) => (b.month < min ? b.month : min),
        budgetsData[0].month,
      )
      setEarliestBudgetMonth(earliest)
    }
    setLoading(false)
    setMounted(true)
  }

  useEffect(() => {
    loadData()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  /* ── Spent calculation ──────────────────────────────────────────── */

  const getSpentAmount = (budget: Budget) =>
    transactions
      .filter(t => {
        const typeMatch     = t.type === 'expense'
        const categoryMatch = t.category.trim().toLowerCase() === budget.category.trim().toLowerCase()
        const ymd           = normalizeDateToYMD(t.date)
        const dateMatch     = ymd.startsWith(budget.month)
        return typeMatch && categoryMatch && dateMatch
      })
      .reduce((sum, t) => sum + Number(t.amount), 0)

  /* ── Derived data ───────────────────────────────────────────────── */

  const filtered = useMemo(
    () => budgets.filter(b => b.month === selectedMonth),
    [budgets, selectedMonth],
  )

  const totalBudget    = filtered.reduce((s, b) => s + b.amount, 0)
  const totalSpent     = filtered.reduce((s, b) => s + getSpentAmount(b), 0)
  const totalRemaining = totalBudget - totalSpent
  const overallPct     = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  /* Over-budget items for alert banner */
  const overBudgetItems = filtered.filter(b => {
    const spent = getSpentAmount(b)
    return spent > b.amount
  })

  /* Sort: over-budget first, then near-limit, then on-track */
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const pctA = a.amount > 0 ? (getSpentAmount(a) / a.amount) * 100 : 0
      const pctB = b.amount > 0 ? (getSpentAmount(b) / b.amount) * 100 : 0
      return pctB - pctA
    })
  }, [filtered, transactions])

  const getCategoryName = (slug: string) => getCategoryByName(slug)?.name || slug

  /* ── Bar scale ──────────────────────────────────────────────────────
     Every card's bar shares ONE percentage scale, set by the most-stretched
     category and rounded up to the next 10. Per-card scaling made each
     over-budget bar fill exactly 100% of its own track, so Food at 115%,
     Entertainment at 110% and Rent at 105% all drew the same solid bar.
     The limit therefore always sits at the same offset across a row, and
     overruns are directly comparable side by side. */
  const pctMax = useMemo(
    () => sortedFiltered.reduce((m, b) => Math.max(m, b.amount > 0 ? (getSpentAmount(b) / b.amount) * 100 : 0), 0),
    [sortedFiltered, transactions]
  )
  const barScale = Math.max(110, Math.ceil(pctMax / 10) * 10)
  const limitPct = (100 / barScale) * 100

  /* ── Month navigation ───────────────────────────────────────────── */

  const goPrev = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setSelectedMonth(mk(d.getFullYear(), d.getMonth() + 1))
  }

  const goNext = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m, 1)
    const now = new Date()
    if (d <= new Date(now.getFullYear(), now.getMonth(), 1)) {
      setSelectedMonth(mk(d.getFullYear(), d.getMonth() + 1))
    }
  }

  const nextDisabled = (() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const now = new Date()
    return new Date(y, m, 1) > new Date(now.getFullYear(), now.getMonth(), 1)
  })()

  const prevDisabled = earliestBudgetMonth !== null && selectedMonth <= earliestBudgetMonth

  /* ── Handlers ───────────────────────────────────────────────────── */

  const handleSave = async () => {
    if (!category || !amount || !month) return
    setSaving(true)
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, { amount: parseFloat(amount), month })
      } else {
        if (budgets.find(b =>
          b.category.trim().toLowerCase() === category.trim().toLowerCase() &&
          b.month === month
        )) {
          toast.error(t('budgetExists'))
          setSaving(false)
          return
        }
        await saveBudget({ category, amount: parseFloat(amount), month })
      }
      await loadData()
      toast.success(editingBudget ? t('budgetUpdated') : t('budgetCreated'))
      closeModal()
    } catch {
      toast.error(t('somethingWrong'))
    }
    setSaving(false)
  }

  const handleEdit = (b: Budget) => {
    setEditingBudget(b)
    setCategory(b.category)
    setAmount(b.amount.toString())
    setMonth(b.month)
    setModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!budgetToDelete) return
    setDeletingId(budgetToDelete.id)
    setDeleteOpen(false)
    setTimeout(async () => {
      await deleteBudget(budgetToDelete.id)
      await loadData()
      setDeletingId(null)
      setBudgetToDelete(null)
      toast.success(t('budgetDeleted'))
    }, 300)
  }

  const openCreate = () => {
    setEditingBudget(null)
    setCategory('')
    setAmount('')
    setMonth(getCurrentMonth())
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingBudget(null)
    setCategory('')
    setAmount('')
    setMonth(getCurrentMonth())
  }

  /* ── Loading / SSR guard ────────────────────────────────────────── */

  if (loading) return <Layout><BudgetsSkeleton /></Layout>
  if (!mounted) return null

  const curMonth      = getCurrentMonth()
  const isCurrentMonth = selectedMonth === curMonth
  const cats          = getExpenseCategories()

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <Layout>
      <div className="mx-auto w-full max-w-[1440px] pb-36 md:pb-8">{/* pb-24 clears the floating add button on mobile */}

        {/* ── Page Header: title + the screen's one finding ────────── */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
            <p className="mt-1 text-sm text-gray-700">
              {overBudgetItems.length > 0
                ? (() => {
                    const worst = overBudgetItems.reduce((a, b) =>
                      getSpentAmount(b) - b.amount > getSpentAmount(a) - a.amount ? b : a
                    )
                    return `${overBudgetItems.length} ${overBudgetItems.length === 1 ? 'category is' : 'categories are'} over — ${getCategoryName(worst.category)} is ${formatIndianCurrency(getSpentAmount(worst) - worst.amount)} over`
                  })()
                : filtered.length > 0
                  ? 'Every category is within its limit this month'
                  : 'Set a monthly limit for the categories you spend in'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center rounded-lg border border-gray-200 bg-white">
              <button
                onClick={goPrev}
                disabled={prevDisabled}
                aria-label="Previous month"
                className={`flex h-8 w-8 items-center justify-center rounded-l-lg transition-colors ${
                  prevDisabled ? 'cursor-not-allowed text-gray-300' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[124px] text-center text-sm font-medium tabular-nums text-gray-900">
                {formatMonthLabel(selectedMonth)}
              </span>
              <button
                onClick={goNext}
                disabled={nextDisabled}
                aria-label="Next month"
                className={`flex h-8 w-8 items-center justify-center rounded-r-lg transition-colors ${
                  nextDisabled ? 'cursor-not-allowed text-gray-300' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {filtered.length > 0 && (
              <button
                onClick={openCreate}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-[#0D9488] px-3 text-sm font-medium text-white transition-colors hover:bg-[#0B7F75]"
              >
                <Plus className="h-4 w-4" />
                New budget
              </button>
            )}
          </div>
        </div>

        {/* ── Summary: three figures in one divided strip ───────────── */}
        {filtered.length > 0 && (() => {
          const isOver   = totalSpent > totalBudget
          const usedPct  = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
          const limitBar = Math.min(100, (totalBudget / Math.max(totalSpent, totalBudget)) * 100)
          const delta    = Math.abs(totalBudget - totalSpent)

          return (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white">
              <div className="grid grid-cols-3 divide-x divide-gray-200">
                <div className="px-4 py-3.5 sm:px-5">
                  <p className="text-xs font-medium text-gray-600">Spent</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-gray-900 sm:text-2xl">
                    {formatIndianCurrency(totalSpent)}
                  </p>
                </div>
                <div className="px-4 py-3.5 sm:px-5">
                  <p className="text-xs font-medium text-gray-600">Budget</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-gray-900 sm:text-2xl">
                    {formatIndianCurrency(totalBudget)}
                  </p>
                </div>
                <div className="px-4 py-3.5 sm:px-5">
                  <p className="text-xs font-medium text-gray-600">{isOver ? 'Over by' : 'Under budget'}</p>
                  <p
                    className="mt-1 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl"
                    style={{ color: isOver ? '#831C1E' : undefined }}
                  >
                    {formatIndianCurrency(delta)}
                  </p>
                </div>
              </div>

              {/* Two-colour bar: teal is the part of the budget you used, red is
                  the part that went past it. The bar is always full-width
                  'budget + overrun', so no axis labels are needed — the colour
                  change IS the limit. */}
              <div className="px-4 pb-4 pt-1 sm:px-5">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  {isOver ? (
                    <>
                      <div
                        className="absolute inset-y-0 left-0 transition-[width] duration-500"
                        style={{ width: `${limitBar}%`, background: '#0D9488' }}
                      />
                      <div
                        className="absolute inset-y-0 right-0 transition-[width] duration-500"
                        style={{ width: `${100 - limitBar}%`, background: '#C4242A' }}
                      />
                    </>
                  ) : (
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                      style={{ width: `${usedPct}%`, background: '#0D9488' }}
                    />
                  )}
                </div>
                <p className="mt-1.5 text-[11px] tabular-nums text-gray-600">
                  {Math.round(usedPct)}% of budget used
                </p>
              </div>
            </div>
          )
        })()}

        {/* ── Budgets ──────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-gray-200 bg-white p-10 text-center"
          >
            <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-base font-semibold text-gray-900">No budgets for {formatMonthLabel(selectedMonth)}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-700">
              A budget is one monthly limit per category. Set one and this screen shows what is left each month.
            </p>
            <button
              onClick={openCreate}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0D9488] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0B7F75]"
            >
              <Plus className="h-4 w-4" />
              Create a budget
            </button>
          </motion.div>
        ) : (
          <>
            <p className="mb-2.5 text-xs font-medium text-gray-600">
              {sortedFiltered.length} {sortedFiltered.length === 1 ? 'budget' : 'budgets'}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sortedFiltered.map((budget, i) => {
                const catData   = getCategoryByName(budget.category)
                const spent     = getSpentAmount(budget)
                const remaining = budget.amount - spent
                const rawPct    = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
                const isOver    = rawPct > 100
                const isNear    = !isOver && rawPct >= 80
                const Icon      = categoryIconMap[budget.category] || categoryIconMap['Other']
                const catColor  = catData?.color ?? '#6B7280'

                // Shared scale (see barScale above), so bars compare across the row.
                const spentPct  = Math.min(100, (rawPct / barScale) * 100)
                const withinPct = Math.min(spentPct, limitPct)

                if (deletingId === budget.id) {
                  return (
                    <motion.div
                      key={budget.id}
                      initial={{ opacity: 1, height: 'auto' }}
                      animate={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    />
                  )
                }

                return (
                  <motion.div
                    key={budget.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    {/* name · status · actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" style={{ color: catColor }} />
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {catData?.name || budget.category}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {isCurrentMonth ? (
                          <>
                            <button
                              onClick={() => handleEdit(budget)}
                              aria-label={`Edit ${catData?.name || budget.category} budget`}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setBudgetToDelete(budget); setDeleteOpen(true) }}
                              aria-label={`Delete ${catData?.name || budget.category} budget`}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-gray-600">View only</span>
                        )}
                      </div>
                    </div>

                    {/* spent of limit */}
                    <p className="mt-2 text-xs tabular-nums text-gray-700">
                      <span className="font-semibold text-gray-900">{formatIndianCurrency(spent)}</span>
                      {' spent of '}
                      {formatIndianCurrency(budget.amount)}
                    </p>

                    {/* teal = spent inside the limit, red = the part past it */}
                    <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${withinPct}%`, background: '#0D9488' }}
                      />
                      {isOver && (
                        <div
                          className="absolute inset-y-0 rounded-r-full"
                          style={{
                            left: `${limitPct}%`,
                            width: `${Math.max(0, spentPct - limitPct)}%`,
                            background: '#C4242A',
                          }}
                        />
                      )}
                    </div>

                    {/* status: colour only on the rows at risk or over */}
                    <div className="mt-2.5">
                      {isOver ? (
                        <span className="inline-flex items-center rounded-md border border-[#F5C6C2] bg-[#FFEDEA] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#831C1E]">
                          {formatIndianCurrency(Math.abs(remaining))} over
                        </span>
                      ) : isNear ? (
                        <span className="inline-flex items-center rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#92400E]">
                          {formatIndianCurrency(remaining)} left
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium tabular-nums text-gray-700">
                          {formatIndianCurrency(remaining)} left
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}



        {/* ── Create / Edit Modal ───────────────────────────────────── */}
        <AnimatePresence>
          {modalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/40 z-50"
                onClick={closeModal}
              />

              <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
                  exit={{ y: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
                  className="w-full md:max-w-[480px] pointer-events-auto"
                >
                  <div className="bg-white rounded-t-3xl md:rounded-2xl max-h-[90vh] overflow-y-auto">
                    {/* Modal Header */}
                    <div
                      className="p-4 relative rounded-t-3xl md:rounded-t-2xl"
                      style={{ background: '#0D9488' }}
                    >
                      <h2 className="text-white font-bold text-base">
                        {editingBudget ? t('editBudget') : t('createBudget')}
                      </h2>
                      {editingBudget && (
                        <p className="text-white/80 text-sm mt-0.5">{t('updateLimitHint')}</p>
                      )}
                      <button
                        onClick={closeModal}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Category Selector */}
                    <div className="mt-4 px-5">
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('category')}</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {cats.map(c => {
                          const CI  = categoryIconMap[c.name] || categoryIconMap['Other']
                          const sel = category === c.name
                          const dis = editingBudget !== null && category !== c.name
                          return (
                            <motion.button
                              key={c.id}
                              whileTap={!dis && !sel ? { scale: 0.95 } : undefined}
                              onClick={() => { if (!dis) setCategory(c.name) }}
                              disabled={dis}
                              className={`rounded-xl p-2 text-center transition-colors ${
                                sel
                                  ? 'bg-teal-50 border-2 border-teal-500'
                                  : dis
                                  ? 'bg-gray-50 border border-gray-100 opacity-40 cursor-not-allowed'
                                  : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <span style={{ color: sel ? '#0D9488' : c.color }}>
                                <CI className="w-4 h-4 mx-auto" />
                              </span>
                              <p className={`text-xs mt-1 truncate ${sel ? 'text-teal-700 font-semibold' : 'text-gray-600'}`}>
                                {c.name}
                              </p>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Amount Field */}
                    <div className="mt-4 px-5">
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('budgetAmount')}</label>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 flex items-center px-4 transition-colors">
                        <span className="text-gray-500 font-semibold text-lg">₹</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          className="flex-1 bg-transparent py-2.5 text-xl font-bold text-gray-800 outline-none ml-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {QUICK_AMOUNTS.map(v => (
                          <button
                            key={v}
                            onClick={() => setAmount(String(v))}
                            className="bg-teal-50 text-teal-700 text-xs rounded-full px-2.5 py-1 border border-teal-200 font-medium hover:bg-teal-100 transition-colors"
                          >
                            ₹{v.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Month Selector */}
                    <div className="mt-4 px-5">
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('month')}</label>
                      <div className="flex gap-2 pb-2">
                        <span className="rounded-full px-3 py-1.5 text-sm bg-teal-600 text-white font-semibold">
                          {formatMonthShort(editingBudget ? month : curMonth)}
                        </span>
                      </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="p-4 flex gap-3">
                      <button
                        onClick={closeModal}
                        className="flex-1 border border-gray-200 rounded-xl py-2.5 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!category || !amount || !month || saving}
                        className={`flex-1 rounded-xl py-2.5 font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                          !category || !amount || !month
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : saving
                            ? 'bg-teal-600 text-white pointer-events-none'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {editingBudget ? 'Saving...' : 'Creating...'}
                          </>
                        ) : editingBudget ? t('saveChanges') : t('createBudget')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* ── Delete Confirmation ───────────────────────────────────── */}
        <AnimatePresence>
          {deleteOpen && budgetToDelete && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-50"
                onClick={() => setDeleteOpen(false)}
              />
              <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none pb-8 px-4">
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-sm pointer-events-auto"
                >
                  <div className="bg-white rounded-2xl p-5 shadow-xl">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                      <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="font-bold text-center mt-3">{t('deleteBudgetTitle')}</p>
                    <p className="text-sm text-gray-500 text-center mt-1">
                      {t('deleteBudgetMessage', { category: budgetToDelete.category, month: formatMonthLabel(budgetToDelete.month) })}
                    </p>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => setDeleteOpen(false)}
                        className="flex-1 border border-gray-200 rounded-xl py-2.5 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        onClick={confirmDelete}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 font-semibold text-sm transition-colors"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

      </div>
    </Layout>
  )
}
