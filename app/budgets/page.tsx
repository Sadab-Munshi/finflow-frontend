'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Utensils, Car, ShoppingBag, Zap, Film, Heart, GraduationCap, Building, ShoppingCart, Sparkles, Briefcase, Wallet, Gift, CircleDot, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactions, getBudgets, saveBudget, updateBudget, deleteBudget } from '@/lib/db'
import { getExpenseCategories, getCategoryByName } from '@/lib/categories'
import { cn, formatIndianCurrency, normalizeDateToYMD } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Budget, Transaction } from '@/lib/types'

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

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function BudgetsPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [month, setMonth] = useState(getCurrentMonth())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    const [budgetsData, transactionsData] = await Promise.all([
      getBudgets(),
      getTransactions()
    ])
    setBudgets(budgetsData)
    setTransactions(transactionsData)
    setLoading(false)
    setMounted(true)
  }

  useEffect(() => {
    loadData()

    // Re-fetch fresh data every time user comes back to this tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  if (loading) return <LoadingScreen />
  if (!mounted) return null

  // Calculate spent amount — uses normalizeDateToYMD to handle all date formats
  const getSpentAmount = (budget: Budget) => {
    return transactions
      .filter(t => {
        const typeMatch = t.type === 'expense'
        const categoryMatch = t.category.trim().toLowerCase() === budget.category.trim().toLowerCase()
        // normalize to YYYY-MM-DD then check YYYY-MM prefix matches budget.month
        const ymd = normalizeDateToYMD(t.date)
        const dateMatch = ymd.startsWith(budget.month)
        return typeMatch && categoryMatch && dateMatch
      })
      .reduce((sum, t) => sum + Number(t.amount), 0)
  }

  const handleSave = async () => {
    if (!category || !amount) return
    if (editingBudget) {
      await updateBudget(editingBudget.id, { amount: parseFloat(amount), month })
    } else {
      if (budgets.find(b =>
        b.category.trim().toLowerCase() === category.trim().toLowerCase() &&
        b.month === month
      )) {
        alert(t('budgetExists'))
        return
      }
      await saveBudget({ category, amount: parseFloat(amount), month })
    }
    await loadData()
    setDialogOpen(false)
    setEditingBudget(null)
    setCategory('')
    setAmount('')
    setMonth(getCurrentMonth())
  }

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget)
    setCategory(budget.category)
    setAmount(budget.amount.toString())
    setMonth(budget.month)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (budgetToDelete) {
      await deleteBudget(budgetToDelete)
      await loadData()
      setBudgetToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingBudget(null)
      setCategory('')
      setAmount('')
      setMonth(getCurrentMonth())
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{t('budgets')}</h1>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('createBudget')}
          </Button>
        </div>

        {budgets.length === 0 ? (
          <Card className="border-gray-100">
            <CardContent className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">🐷</p>
              <p>{t('noBudgets')}</p>
              <p className="text-sm">{t('createFirst')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget) => {
              const categoryData = getCategoryByName(budget.category)
              const spent = getSpentAmount(budget)
              const remaining = budget.amount - spent
              const percentage = budget.amount > 0
                ? Math.min((spent / budget.amount) * 100, 100)
                : 0

              return (
                <Card key={budget.id} className="border-gray-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${categoryData?.color}15` }}
                        >
                          <span style={{ color: categoryData?.color }}>
                            {categoryIcons[budget.category] || categoryIcons['Other']}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{categoryData?.name}</p>
                          <p className="text-xs text-gray-500">{budget.month}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(budget)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setBudgetToDelete(budget.id); setDeleteDialogOpen(true) }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('budgetAmount')}</span>
                        <span className="font-medium">{formatIndianCurrency(budget.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('spent')}</span>
                        <span className="font-medium text-orange-500">{formatIndianCurrency(spent)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('remaining')}</span>
                        <span className={cn(
                          "font-medium",
                          remaining >= 0 ? "text-emerald-600" : "text-red-500"
                        )}>
                          {formatIndianCurrency(Math.abs(remaining))}
                          {remaining < 0 && ' over'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={cn(
                            "h-3 rounded-full transition-all",
                            percentage < 80
                              ? "bg-emerald-500"
                              : percentage < 100
                              ? "bg-amber-500"
                              : "bg-red-500"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {percentage.toFixed(0)}% {t('used')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBudget ? t('edit') : t('createBudget')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!editingBudget && (
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('category')}</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder={t('category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {getExpenseCategories().map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">{t('budgetAmount')}</label>
                <Input
                  type="number"
                  placeholder={t('amount')}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-gray-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Month</label>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="border-gray-200"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
                className="border-gray-200"
              >
                {t('cancel')}
              </Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                {editingBudget ? t('save') : t('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('deleteConfirmMessage')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                {t('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </Layout>
  )
}
