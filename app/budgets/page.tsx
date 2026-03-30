'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, X, Loader2,
  ChevronLeft, ChevronRight, Wallet,
  Utensils, Car, ShoppingBag, Zap, Film, Heart,
  GraduationCap, Building, ShoppingCart, Sparkles,
  Briefcase, Gift, CircleDot, TrendingUp,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactions, getBudgets, saveBudget, updateBudget, deleteBudget } from '@/lib/db'
import { getExpenseCategories, getCategoryByName } from '@/lib/categories'
import { formatIndianCurrency, normalizeDateToYMD } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Budget, Transaction } from '@/lib/types'

/* ── Helpers & constants ──────────────────────────────────────────────── */

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const formatMonthLabel = (m: string) => {
  const [y, mo] = m.split('-')
  return `${MONTH_NAMES[parseInt(mo) - 1]} ${y}`
}

const formatMonthShort = (m: string) => {
  const [y, mo] = m.split('-')
  return `${MONTH_NAMES[parseInt(mo) - 1].slice(0, 3)} ${y}`
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function mk(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}`
}

function getMonthPickerOptions(): string[] {
  const now = new Date()
  const out: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(mk(d.getFullYear(), d.getMonth() + 1))
  }
  return out
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

function pColor(pct: number) {
  if (pct <= 50) return '#16A34A'
  if (pct <= 80) return '#D97706'
  return '#DC2626'
}

function statusBadge(pct: number) {
  if (pct <= 50) return { label: 'On Track', cls: 'bg-green-50 text-green-700' }
  if (pct <= 80) return { label: 'Near Limit', cls: 'bg-amber-50 text-amber-700' }
  return { label: 'Over Budget', cls: 'bg-red-50 text-red-700' }
}

function borderCls(pct: number) {
  if (pct <= 50) return 'border-green-500'
  if (pct <= 80) return 'border-amber-500'
  return 'border-red-500'
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function BudgetsPage() {
  const { t } = useLanguage()

  /* data state */
  const [mounted, setMounted] = useState(false)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())

  /* modal state */
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [month, setMonth] = useState(getCurrentMonth())
  const [saving, setSaving] = useState(false)

  /* delete state */
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  /* ── Data loading (unchanged) ───────────────────────────────────────── */

  const loadData = async () => {
    setLoading(true)
    const [budgetsData, transactionsData] = await Promise.all([
      getBudgets(),
      getTransactions(),
    ])
    setBudgets(budgetsData)
    setTransactions(transactionsData)
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

  /* ── Spent calculation (unchanged) ──────────────────────────────────── */

  const getSpentAmount = (budget: Budget) => {
    return transactions
      .filter(t => {
        const typeMatch = t.type === 'expense'
        const categoryMatch = t.category.trim().toLowerCase() === budget.category.trim().toLowerCase()
        const ymd = normalizeDateToYMD(t.date)
        const dateMatch = ymd.startsWith(budget.month)
        return typeMatch && categoryMatch && dateMatch
      })
      .reduce((sum, t) => sum + Number(t.amount), 0)
  }

  /* ── Derived data ───────────────────────────────────────────────────── */

  const filtered = useMemo(
    () => budgets.filter(b => b.month === selectedMonth),
    [budgets, selectedMonth],
  )
  const totalBudget = filtered.reduce((s, b) => s + b.amount, 0)
  const totalSpent = filtered.reduce((s, b) => s + getSpentAmount(b), 0)
  const totalRemaining = totalBudget - totalSpent

  /* ── Month navigation ───────────────────────────────────────────────── */

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
    return new Date(y, m, 1) > new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })()

  /* ── Handlers (logic preserved) ─────────────────────────────────────── */

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

  /* ── Loading ────────────────────────────────────────────────────────── */

  if (loading) return <LoadingScreen />
  if (!mounted) return null

  const curMonth = getCurrentMonth()
  const cats = getExpenseCategories()
  const monthOpts = getMonthPickerOptions()

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <Layout>
      <div className="max-w-2xl mx-auto pb-8">

        {/* ── Section 1: Page Header ──────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Budgets</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-4 py-2 font-semibold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Budget
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-full bg-teal-50 hover:bg-teal-100 flex items-center justify-center text-teal-600 transition-colors"
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

        {/* Summary pills */}
        <div className="flex gap-2 mb-6">
          {[
            { label: 'Total Budget', value: formatIndianCurrency(totalBudget), color: 'text-gray-800' },
            { label: 'Spent', value: formatIndianCurrency(totalSpent), color: totalSpent > totalBudget ? 'text-red-500' : 'text-gray-800' },
            { label: 'Remaining', value: formatIndianCurrency(Math.abs(totalRemaining)), color: totalRemaining >= 0 ? 'text-green-600' : 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="flex-1 bg-white rounded-xl shadow-sm px-3 py-2">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Section 2 & 3: Cards or Empty state ─────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
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
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((budget, i) => {
              const catData = getCategoryByName(budget.category)
              const spent = getSpentAmount(budget)
              const remaining = budget.amount - spent
              const rawPct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
              const clampPct = Math.min(rawPct, 100)
              const badge = statusBadge(rawPct)
              const progColor = pColor(rawPct)
              const Icon = categoryIconMap[budget.category] || categoryIconMap['Other']

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
                  className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${borderCls(rawPct)}`}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between p-4 pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${catData?.color}15` }}
                      >
                        <span style={{ color: catData?.color }}>
                          <Icon className="w-4 h-4" />
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {catData?.name || budget.category}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatMonthLabel(budget.month)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <button
                        onClick={() => handleEdit(budget)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => {
                          setBudgetToDelete(budget)
                          setDeleteOpen(true)
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Stats rows */}
                  <div className="px-4 py-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Budget Amount</span>
                      <span className="text-sm font-medium text-gray-800">
                        {formatIndianCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Spent</span>
                      <span
                        className={`text-sm font-medium ${
                          rawPct > 80 ? 'text-red-500' : 'text-green-600'
                        }`}
                      >
                        {formatIndianCurrency(spent)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Remaining</span>
                      <span
                        className={`text-sm font-medium ${
                          remaining >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {remaining >= 0
                          ? `${formatIndianCurrency(remaining)} remaining`
                          : `${formatIndianCurrency(Math.abs(remaining))} over`}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mx-4 mb-1">
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

                  {/* Percentage label */}
                  <p
                    className="px-4 pb-3 text-right text-xs font-medium"
                    style={{ color: progColor }}
                  >
                    {Math.round(rawPct)}% used
                  </p>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* ── Section 4 & 5: Create / Edit Modal ──────────────────────── */}
        <AnimatePresence>
          {modalOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                onClick={closeModal}
              />

              {/* Modal wrapper */}
              <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
                  exit={{ y: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
                  className="w-full md:max-w-[480px] pointer-events-auto"
                >
                  <div className="bg-white rounded-t-3xl md:rounded-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div
                      className="p-5 relative rounded-t-3xl md:rounded-t-2xl"
                      style={{ background: 'linear-gradient(135deg, #0D9488, #059669)' }}
                    >
                      <h2 className="text-white font-bold text-lg">
                        {editingBudget ? 'Edit Budget' : 'Create Budget'}
                      </h2>
                      <p className="text-white/80 text-sm mt-0.5">
                        {editingBudget
                          ? 'Update your spending limit'
                          : 'Set a spending limit for a category'}
                      </p>
                      <button
                        onClick={closeModal}
                        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Category selector */}
                    <div className="mt-4 px-5">
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">
                        Category
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {cats.map(c => {
                          const CI = categoryIconMap[c.name] || categoryIconMap['Other']
                          const sel = category === c.name
                          const dis = editingBudget !== null && category !== c.name
                          return (
                            <motion.button
                              key={c.id}
                              whileTap={!dis && !sel ? { scale: 0.95 } : undefined}
                              onClick={() => { if (!dis) setCategory(c.name) }}
                              disabled={dis}
                              className={`rounded-xl p-2.5 text-center transition-all ${
                                sel
                                  ? 'bg-teal-50 border-2 border-teal-500'
                                  : dis
                                  ? 'bg-gray-50 border border-gray-100 opacity-40 cursor-not-allowed'
                                  : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <span style={{ color: sel ? '#0D9488' : c.color }}>
                                <CI className="w-5 h-5 mx-auto" />
                              </span>
                              <p
                                className={`text-xs mt-1 truncate ${
                                  sel ? 'text-teal-700 font-semibold' : 'text-gray-600'
                                }`}
                              >
                                {c.name}
                              </p>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Amount field */}
                    <div className="mt-4 px-5">
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">
                        Budget Amount
                      </label>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 flex items-center px-4 transition-all">
                        <span className="text-gray-500 font-semibold text-lg">₹</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          className="flex-1 bg-transparent py-3.5 text-xl font-bold text-gray-800 outline-none ml-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {QUICK_AMOUNTS.map(v => (
                          <button
                            key={v}
                            onClick={() => setAmount(String(v))}
                            className="bg-teal-50 text-teal-700 text-xs rounded-full px-3 py-1.5 border border-teal-200 font-medium hover:bg-teal-100 transition-colors"
                          >
                            ₹{v.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Month selector */}
                    <div className="mt-4 px-5">
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">
                        Month
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {monthOpts.map(mo => {
                          const sel = month === mo
                          const future = mo > curMonth
                          const dis = future || (editingBudget !== null && mo !== month)
                          return (
                            <button
                              key={mo}
                              onClick={() => { if (!dis) setMonth(mo) }}
                              disabled={dis}
                              className={`shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${
                                sel
                                  ? 'bg-teal-600 text-white font-semibold'
                                  : future
                                  ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                  : dis
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-gray-100 text-gray-600 font-medium hover:bg-gray-200'
                              }`}
                            >
                              {formatMonthShort(mo)}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="p-5 pt-4 flex gap-3">
                      <button
                        onClick={closeModal}
                        className="flex-1 border border-gray-200 rounded-xl py-3 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!category || !amount || !month || saving}
                        className={`flex-1 rounded-xl py-3 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
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
                        ) : editingBudget ? (
                          'Save Changes'
                        ) : (
                          'Create Budget'
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* ── Section 6: Delete Confirmation ───────────────────────────── */}
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
                    <Trash2 className="w-10 h-10 text-red-500 mx-auto" />
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
