'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, X, Loader2, MoreHorizontal,
  ChevronLeft, ChevronRight, Wallet,
  Utensils, Car, ShoppingBag, Zap, Film, Heart,
  GraduationCap, Building, ShoppingCart, Sparkles,
  Briefcase, Gift, CircleDot, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownLeft,
} from 'lucide-react'
import Link from 'next/link'
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
  const [openMenuId, setOpenMenuId]     = useState<string | null>(null)
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

  /* Row menu: closes on Escape or a click anywhere outside it, so it can never
     be left open behind another interaction or trap keyboard focus. */
  useEffect(() => {
    if (!openMenuId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const trigger = document.querySelector<HTMLElement>(`[data-menu-trigger="${openMenuId}"]`)
      setOpenMenuId(null)
      trigger?.focus()
    }
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (!target?.closest('[data-budget-menu]')) setOpenMenuId(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [openMenuId])

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
    <Layout hideFab>
      <div
        className="mx-auto w-full max-w-[1240px] pb-6 md:pb-8"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >

        {/* ── Heading · month · create ─────────────────────────────── */}
        <div className="mb-1.5 flex flex-col gap-1.5 sm:mb-4 sm:gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-2xl">
              {t('title')}
            </h1>
            <p className="mt-0.5 text-sm leading-5 text-gray-700">
              Track your monthly spending limits.
            </p>
          </div>

          {/* Month + create share one row at every width. The stepper takes the
              slack on phones so the create button never orphans onto its own
              row with dead space beside it. */}
          <div className="flex items-center gap-2 sm:shrink-0">
            <div className="flex min-w-0 flex-1 items-center rounded-lg border border-gray-300 bg-white sm:flex-none">
              <button
                onClick={goPrev}
                disabled={prevDisabled}
                aria-label="Previous month"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-l-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-inset sm:w-11 ${
                  prevDisabled ? 'cursor-not-allowed text-gray-300' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span
                aria-live="polite"
                className="min-w-0 flex-1 truncate px-1 text-center text-sm font-medium tabular-nums text-gray-900 sm:min-w-[112px] sm:flex-none"
              >
                {formatMonthLabel(selectedMonth)}
              </span>
              <button
                onClick={goNext}
                disabled={nextDisabled}
                aria-label="Next month"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-r-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-inset sm:w-11 ${
                  nextDisabled ? 'cursor-not-allowed text-gray-300' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {filtered.length > 0 && (
              <button
                onClick={openCreate}
                aria-label="Create new budget"
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#115E59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 sm:px-4"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden min-[370px]:inline">New budget</span>
                <span className="min-[370px]:hidden">New</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Summary ──────────────────────────────────────────────────
             Phones: Spent / Total budget as a two-column row, then
            "Remaining overall" as a single label-and-value line beneath.
            Three equal columns forced the long label to wrap and pushed the
            values out of alignment, and cost ~40px of vertical space. */}
        {filtered.length > 0 && (() => {
          const overCount = overBudgetItems.length
          const atLimitCount = filtered.filter((b) => {
            const lim = Math.round(b.amount * 100) / 100
            return lim > 0 && Math.round(getSpentAmount(b) * 100) / 100 === lim
          }).length
          const remaining = totalBudget - totalSpent
          const usedPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
          const fillPct = Math.min(100, usedPct)
          const over = overCount > 0

          const statusParts: string[] = []
          if (overCount > 0) statusParts.push(`${overCount} over budget`)
          if (atLimitCount > 0) statusParts.push(`${atLimitCount} at limit`)
          const statusText = statusParts.length ? statusParts.join(' · ') : 'All budgets within limit'

          return (
            <section
              aria-label="Budget summary"
              className="mb-2.5 rounded-xl border border-gray-300 bg-white sm:mb-5"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3">
                <div className="px-3 py-1.5 sm:px-5 sm:py-4">
                  <p className="text-xs font-medium text-gray-600">Spent</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-gray-900 sm:mt-1 sm:text-2xl">
                    {formatIndianCurrency(totalSpent)}
                  </p>
                </div>
                <div className="border-l border-gray-200 px-3 py-1.5 sm:px-5 sm:py-4">
                  <p className="text-xs font-medium text-gray-600">Total budget</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-gray-900 sm:mt-1 sm:text-2xl">
                    {formatIndianCurrency(totalBudget)}
                  </p>
                </div>
                <div className="col-span-2 flex items-baseline justify-between gap-3 border-t border-gray-200 px-3 py-1.5 sm:col-span-1 sm:block sm:border-l sm:border-t-0 sm:px-5 sm:py-4">
                  <p className="text-xs font-medium text-gray-600">Remaining overall</p>
                  <p
                    className="text-lg font-semibold tabular-nums tracking-tight sm:mt-1 sm:text-2xl"
                    style={{ color: remaining < 0 ? '#831C1E' : '#111827' }}
                  >
                    {formatIndianCurrency(Math.abs(remaining))}
                    {remaining < 0 && <span className="ml-1 text-sm font-medium">over</span>}
                  </p>
                </div>
              </div>

              <div className="px-3 pb-2 sm:px-5 sm:pb-4">
                <div
                  role="progressbar"
                  aria-label="Total budget used"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(fillPct)}
                  aria-valuetext={`${Math.round(usedPct)}% of total budget used`}
                  className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${fillPct}%`, background: '#0D9488' }}
                  />
                </div>
                {/* Stacked on phones so the percentage and the warning count are
                    never squeezed into one crowded line. */}
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5">
                  <p className="text-xs tabular-nums text-gray-600">
                    {Math.round(usedPct)}% of budget used
                  </p>
                  <p
                    className={`flex items-center gap-1.5 text-xs font-semibold ${
                      over ? 'text-[#831C1E]' : 'text-gray-700'
                    }`}
                  >
                    {over && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                    {statusText}
                  </p>
                </div>
              </div>
            </section>
          )
        })()}

        {/* ── Budgets ──────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-gray-300 bg-white px-4 py-10 text-center sm:p-10"
          >
            <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-400" aria-hidden="true" />
            <p className="text-base font-semibold text-gray-900">
              No budgets for {formatMonthLabel(selectedMonth)}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-700">
              A budget is one monthly limit per category. Set one and this screen shows what is left each month.
            </p>
            <button
              onClick={openCreate}
              className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#0F766E] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#115E59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create a budget
            </button>
          </motion.div>
        ) : (
          <>
            <p className="mb-1 text-xs font-medium text-gray-600 sm:mb-2">
              {sortedFiltered.length} {sortedFiltered.length === 1 ? 'budget' : 'budgets'}
            </p>

            {/* 1 col on phones, 2 from sm (tablet/large landscape), 3 only once
                each card still has comfortable width (xl). */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
              {sortedFiltered.map((budget, i) => {
                const catData  = getCategoryByName(budget.category)
                const name     = catData?.name || budget.category
                const spent    = getSpentAmount(budget)
                const limit    = budget.amount

                // Money is compared at paise precision so "exactly at the limit"
                // is a real equality test, not a float coincidence.
                const spentR   = Math.round(spent * 100) / 100
                const limitR   = Math.round(limit * 100) / 100
                const hasLimit = limitR > 0

                // Track is always 100% of THIS category's budget.
                const pct      = hasLimit ? (spent / limit) * 100 : 0
                const isOver   = hasLimit && spentR > limitR
                const atLimit  = hasLimit && spentR === limitR
                const fill     = hasLimit ? Math.min(100, Math.max(0, pct)) : 0
                const fillColor = isOver ? '#C4242A' : atLimit ? '#B45309' : '#0D9488'

                const Icon     = categoryIconMap[budget.category] || categoryIconMap['Other']
                const catColor = catData?.color ?? '#6B7280'
                const menuOpen = openMenuId === budget.id

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
                  <motion.article
                    key={budget.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="flex flex-col rounded-xl border border-gray-300 bg-white p-3 sm:p-4"
                  >
                    {/* 1 · category name + actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <Icon
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: catColor }}
                          aria-hidden="true"
                        />
                        <h2 className="text-sm font-semibold leading-5 text-gray-900 sm:text-[15px]">
                          {name}
                        </h2>
                      </div>

                      <div className="flex shrink-0 items-center">
                        {isCurrentMonth ? (
                          <>
                            <button
                              onClick={() => handleEdit(budget)}
                              aria-label={`Edit ${name} budget`}
                              className="-my-2 flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </button>

                            <div className="relative" data-budget-menu>
                              <button
                                onClick={() => setOpenMenuId(menuOpen ? null : budget.id)}
                                aria-label={`More actions for ${name}`}
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                data-menu-trigger={budget.id}
                                className="-my-2 flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                              >
                                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                              </button>

                              {menuOpen && (
                                <div
                                  role="menu"
                                  aria-label={`Actions for ${name}`}
                                  className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-300 bg-white py-1 shadow-lg"
                                >
                                  <button
                                    role="menuitem"
                                    autoFocus
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      setBudgetToDelete(budget)
                                      setDeleteOpen(true)
                                    }}
                                    className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm text-[#831C1E] transition-colors hover:bg-[#FFEDEA] focus-visible:outline-none focus-visible:bg-[#FFEDEA]"
                                  >
                                    <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    Delete budget
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-600">View only</span>
                        )}
                      </div>
                    </div>

                    {/* 2 · spent against the limit */}
                    <p className="mt-1 text-sm leading-5 tabular-nums">
                      <span className="font-semibold text-gray-900">{formatIndianCurrency(spent)}</span>
                      <span className="text-gray-600"> spent of </span>
                      <span className="text-gray-900">{formatIndianCurrency(limit)}</span>
                    </p>

                    {/* 3 · progress: always a 0-100% track of this budget */}
                    <div
                      role="progressbar"
                      aria-label={`${name} budget used`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(fill)}
                      aria-valuetext={
                        !hasLimit
                          ? 'No limit set'
                          : isOver
                            ? `${Math.round(pct)}% of budget used, ${formatIndianCurrency(spent - limit)} over`
                            : atLimit
                              ? 'Limit reached'
                              : `${Math.round(pct)}% of budget used, ${formatIndianCurrency(limit - spent)} remaining`
                      }
                      className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200"
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${fill}%`, background: fillColor }}
                      />
                    </div>

                    {/* 4 · status — always in words, never colour alone */}
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                      {!hasLimit ? (
                        <span className="text-xs font-medium text-gray-700">No limit set</span>
                      ) : isOver ? (
                        <span className="inline-flex items-center rounded-md border border-[#F5C6C2] bg-[#FFEDEA] px-2 py-1 text-xs font-semibold tabular-nums text-[#831C1E]">
                          {Math.round(pct)}% used · {formatIndianCurrency(spent - limit)} over
                        </span>
                      ) : atLimit ? (
                        <span className="inline-flex items-center rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-2 py-1 text-xs font-semibold tabular-nums text-[#92400E]">
                          Limit reached
                        </span>
                      ) : (
                        <span className="text-xs font-medium tabular-nums text-gray-700">
                          {formatIndianCurrency(limit - spent)} remaining
                        </span>
                      )}

                      {/* Real drill-down: /history filters by ?category= already. */}
                      <Link
                        href={`/history?category=${encodeURIComponent(budget.category)}`}
                        className="-my-2 inline-flex min-h-[44px] items-center gap-0.5 rounded-md px-1 text-xs font-semibold text-[#0B7F75] transition-colors hover:text-[#0D9488] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                      >
                        View spending
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </motion.article>
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
