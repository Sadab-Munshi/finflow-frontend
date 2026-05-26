'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, X, Loader2,
  ChevronLeft, ChevronRight, Wallet,
  Utensils, Car, ShoppingBag, Zap, Film, Heart,
  GraduationCap, Building, ShoppingCart, Sparkles,
  Briefcase, Gift, CircleDot, TrendingUp, AlertTriangle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
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
  'Gift': Gift,
  'Other': CircleDot,
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000]

/* Status helpers */
function pColor(pct: number) {
  if (pct <= 50) return '#16A34A'
  if (pct <= 80) return '#D97706'
  return '#DC2626'
}

function statusBadge(pct: number) {
  if (pct <= 50) return {
    label: 'On Track',
    pill: 'bg-green-50 text-green-700',
    dot: 'bg-green-500',
  }
  if (pct <= 80) return {
    label: 'Near Limit',
    pill: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  }
  return {
    label: 'Over Budget',
    pill: 'bg-red-50 text-red-700',
    dot: 'bg-red-500',
  }
}

/* Icon background tint from category color */
function iconBg(hex: string) {
  return `${hex}18`
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function BudgetsPage() {
  const { t } = useLanguage()

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
      toast.success(editingBudget ? 'Budget updated successfully!' : 'Budget created successfully!')
      closeModal()
    } catch {
      toast.error('Something went wrong')
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
      toast.success('Budget deleted')
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
      <div className="max-w-2xl mx-auto pb-8">

        {/* ── Page Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Budgets</h1>
          {filtered.length > 0 && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-4 py-2 font-semibold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Budget
            </button>
          )}
        </div>

        {/* ── Month Navigation ─────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={goPrev}
            disabled={prevDisabled}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              prevDisabled
                ? 'bg-gray-100 text-gray-300 opacity-30 cursor-not-allowed pointer-events-none'
                : 'bg-teal-50 hover:bg-teal-100 text-teal-600'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-semibold text-gray-800 select-none">
            {formatMonthLabel(selectedMonth)}
          </span>
          <button
            onClick={goNext}
            disabled={nextDisabled}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              nextDisabled
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-teal-50 hover:bg-teal-100 text-teal-600'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* ── Hero Summary Card (Concept D — segmented bar) ────────── */}
        {filtered.length > 0 && (() => {
          const isOver       = totalSpent > totalBudget
          const overAmount   = totalSpent - totalBudget
          // Width of the teal (budget) segment as % of total spent
          const budgetSegPct = isOver
            ? Math.round((totalBudget / totalSpent) * 100)
            : Math.round(overallPct)
          const overSegPct   = isOver ? 100 - budgetSegPct : 0

          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              {/* Header row: amount + badge */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    {isOver ? 'Total spent · ' : 'Spent so far · '}
                    {formatMonthLabel(selectedMonth)}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 tracking-tight leading-none">
                    {formatIndianCurrency(totalSpent)}
                  </p>
                </div>
                {isOver ? (
                  <span className="shrink-0 text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1">
                    {formatIndianCurrency(overAmount)} over
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-3 py-1">
                    {Math.round(overallPct)}% used
                  </span>
                )}
              </div>

              {/* Segmented bar */}
              <div className="h-2.5 rounded-full overflow-hidden flex mb-2.5"
                style={{ background: isOver ? 'transparent' : '#f1f5f9' }}
              >
                {isOver ? (
                  <>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${budgetSegPct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full bg-teal-500"
                      style={{ borderRadius: '9999px 0 0 9999px' }}
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${overSegPct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                      className="h-full bg-red-500"
                      style={{ borderRadius: '0 9999px 9999px 0' }}
                    />
                  </>
                ) : (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${budgetSegPct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-teal-500 rounded-full"
                  />
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-teal-500 inline-block" />
                  <span className="text-[11px] text-gray-500">
                    Budget ({formatIndianCurrency(totalBudget)})
                  </span>
                </div>
                {isOver && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />
                    <span className="text-[11px] text-gray-500">
                      Overspend ({formatIndianCurrency(overAmount)})
                    </span>
                  </div>
                )}
              </div>

              {/* Stat cells */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-1">Total budget</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatIndianCurrency(totalBudget)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-1">Active budgets</p>
                  <p className={`text-sm font-semibold ${isOver ? 'text-red-600' : 'text-teal-600'}`}>
                    {filtered.length}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })()}

        {/* ── Over-budget Alert Banner ──────────────────────────────── */}
        <AnimatePresence>
          {overBudgetItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
                <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-800 leading-snug">
                    {overBudgetItems.length === 1
                      ? `${overBudgetItems[0].category} is ${formatIndianCurrency(getSpentAmount(overBudgetItems[0]) - overBudgetItems[0].amount)} over budget`
                      : `${overBudgetItems.length} categories are over budget`}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Consider adjusting your limits or reducing spending
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty State ───────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl p-8 text-center shadow-sm"
          >
            <Wallet className="w-16 h-16 text-teal-300 mx-auto mb-4" />
            <p className="font-semibold text-gray-700 text-base">
              No budgets for {formatMonthLabel(selectedMonth)}
            </p>
            <p className="text-sm text-gray-400 leading-relaxed mt-1">
              Create a budget to track your spending and stay on top of your finances.
            </p>
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-6 py-2.5 font-semibold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Budget
            </button>
          </motion.div>
        ) : (
          <>
            {/* Section label */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 ml-0.5">
              All budgets
            </p>

            {/* ── Budget Cards ─────────────────────────────────────── */}
            <div className="space-y-3">
              {sortedFiltered.map((budget, i) => {
                const catData  = getCategoryByName(budget.category)
                const spent    = getSpentAmount(budget)
                const remaining = budget.amount - spent
                const rawPct   = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
                const clampPct = Math.min(rawPct, 100)
                const badge    = statusBadge(rawPct)
                const progColor = pColor(rawPct)
                const isOver   = rawPct > 100
                const Icon     = categoryIconMap[budget.category] || categoryIconMap['Other']
                const catColor = catData?.color ?? '#6b7280'

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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className={`bg-white rounded-2xl shadow-sm overflow-hidden ${
                      isOver ? 'border-[1.5px] border-red-200' : 'border border-gray-100'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between p-4 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: isOver ? '#fee2e2' : iconBg(catColor) }}
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{ color: isOver ? '#dc2626' : catColor }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">
                            {catData?.name || budget.category}
                          </p>
                          <p className="text-xs text-gray-400">{formatMonthLabel(budget.month)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrentMonth ? (
                          <>
                            <button
                              onClick={() => handleEdit(budget)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <button
                              onClick={() => { setBudgetToDelete(budget); setDeleteOpen(true) }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                            View Only
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mx-4 mb-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${clampPct}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: progColor }}
                        />
                      </div>
                    </div>

                    {/* Stat Cells */}
                    <div className="grid grid-cols-3 gap-2 px-4 mb-3">
                      <div className="bg-gray-50 rounded-xl p-2">
                        <p className="text-[10px] text-gray-400 mb-1">Budget</p>
                        <p className="text-xs font-semibold text-gray-800">
                          {formatIndianCurrency(budget.amount)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2">
                        <p className="text-[10px] text-gray-400 mb-1">Spent</p>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: progColor }}
                        >
                          {formatIndianCurrency(spent)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2">
                        <p className="text-[10px] text-gray-400 mb-1">
                          {remaining >= 0 ? 'Left' : 'Over by'}
                        </p>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: progColor }}
                        >
                          {formatIndianCurrency(Math.abs(remaining))}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer: status pill + percentage */}
                    <div className="flex items-center justify-between px-4 pb-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                      <span className="text-xs font-medium" style={{ color: progColor }}>
                        {Math.round(rawPct)}% used
                      </span>
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
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
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
                      style={{ background: 'linear-gradient(135deg, #0D9488, #059669)' }}
                    >
                      <h2 className="text-white font-bold text-base">
                        {editingBudget ? 'Edit Budget' : 'Create Budget'}
                      </h2>
                      {editingBudget && (
                        <p className="text-white/80 text-sm mt-0.5">Update your spending limit</p>
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
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Category</label>
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
                              className={`rounded-xl p-2 text-center transition-all ${
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
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Budget Amount</label>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 flex items-center px-4 transition-all">
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
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Month</label>
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
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!category || !amount || !month || saving}
                        className={`flex-1 rounded-xl py-2.5 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
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
                        ) : editingBudget ? 'Save Changes' : 'Create Budget'}
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
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
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
                    <p className="font-bold text-center mt-3">Delete Budget?</p>
                    <p className="text-sm text-gray-500 text-center mt-1">
                      Delete {budgetToDelete.category} budget for{' '}
                      {formatMonthLabel(budgetToDelete.month)}? This cannot be undone.
                    </p>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => setDeleteOpen(false)}
                        className="flex-1 border border-gray-200 rounded-xl py-2.5 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmDelete}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 font-semibold text-sm transition-colors"
                      >
                        Delete
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
