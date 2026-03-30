'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Edit, Trash2, Utensils, Car, ShoppingBag, Zap, Film, Heart, GraduationCap, Building, ShoppingCart, Sparkles, Briefcase, Wallet, Gift, CircleDot, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactionById, updateTransaction, deleteTransaction } from '@/lib/db'
import { getCategoriesByType, getCategoryByName } from '@/lib/categories'
import { cn, formatIndianCurrency } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Transaction } from '@/lib/types'

const categoryIcons: Record<string, React.ReactNode> = {
  'Food & Dining': <Utensils className="w-7 h-7" />,
  'Transport': <Car className="w-7 h-7" />,
  'Shopping': <ShoppingBag className="w-7 h-7" />,
  'Bills & Utilities': <Zap className="w-7 h-7" />,
  'Entertainment': <Film className="w-7 h-7" />,
  'Health': <Heart className="w-7 h-7" />,
  'Education': <GraduationCap className="w-7 h-7" />,
  'Rent': <Building className="w-7 h-7" />,
  'Groceries': <ShoppingCart className="w-7 h-7" />,
  'Personal Care': <Sparkles className="w-7 h-7" />,
  'Salary': <Wallet className="w-7 h-7" />,
  'Freelance': <Briefcase className="w-7 h-7" />,
  'Business': <Briefcase className="w-7 h-7" />,
  'Investment': <TrendingUp className="w-7 h-7" />,
  'Gift': <Gift className="w-7 h-7" />,
  'Other': <CircleDot className="w-7 h-7" />,
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3) return dateStr
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTimeDisplay(isoStr: string | undefined): string {
  if (!isoStr) return ''
  const date = new Date(isoStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default function TransactionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useLanguage()
  const id = params.id as string

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income'|'expense'>('expense')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const load = async () => {
      const tx = await getTransactionById(id)
      if (tx) {
        setTransaction(tx)
        setAmount(tx.amount.toString())
        setType(tx.type)
        setCategory(tx.category)
        setNote(tx.note)
        setDate(tx.date)
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <LoadingScreen />
  if (!transaction) return <Layout><div className="flex items-center justify-center h-64"><p className="text-gray-500">{t('noResults')}</p></div></Layout>

  const cat = getCategoryByName(transaction.category)

  const handleSave = async () => {
    const updates = { amount: parseFloat(amount), type, category, note, date }
    await updateTransaction(id, updates)
    setTransaction({ ...transaction, ...updates })
    setEditing(false)
  }

  const handleDelete = async () => {
    await deleteTransaction(id)
    router.push('/history')
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="no-print"><ChevronLeft className="w-5 h-5" /></Button>
          <h1 className="text-2xl font-bold text-gray-800">{t('transactionDetails')}</h1>
        </div>

        <Card className="border-gray-100">
          <CardContent className="p-6 space-y-6">
            {editing ? (
              <div className="space-y-4">
                <div><label className="text-sm font-medium text-gray-700">{t('amount')}</label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="border-gray-200" /></div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('type')}</label>
                  <div className="flex gap-2 mt-1">
                    <Button type="button" variant={type === 'expense' ? 'default' : 'outline'} onClick={() => setType('expense')} className={cn("flex-1", type === 'expense' ? "bg-orange-500" : "border-gray-200")}>{t('expense')}</Button>
                    <Button type="button" variant={type === 'income' ? 'default' : 'outline'} onClick={() => setType('income')} className={cn("flex-1", type === 'income' ? "bg-emerald-500" : "border-gray-200")}>{t('income')}</Button>
                  </div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">{t('category')}</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-gray-200"><SelectValue /></SelectTrigger>
                    <SelectContent>{getCategoriesByType(type).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">{t('description')}</label><Input value={note} onChange={(e) => setNote(e.target.value)} className="border-gray-200" /></div>
                <div><label className="text-sm font-medium text-gray-700">{t('date')}</label><Input value={date} onChange={(e) => setDate(e.target.value)} className="border-gray-200" /></div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-700">{t('save')}</Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="flex-1 border-gray-200">{t('cancel')}</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat?.color}20` }}>
                      <span style={{ color: cat?.color }}>{categoryIcons[transaction.category] || categoryIcons['Other']}</span>
                    </div>
                  </div>
                  <p className={cn("text-4xl font-bold", transaction.type === 'income' ? "text-emerald-600" : "text-orange-600")}>
                    {transaction.type === 'income' ? '+' : '-'}{formatIndianCurrency(transaction.amount)}
                  </p>
                  <span className={cn("inline-block mt-2 px-3 py-1 rounded-full text-sm", transaction.type === 'income' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700")}>
                    {transaction.type === 'income' ? t('income') : t('expense')}
                  </span>
                </div>
                <div className="grid grid-cols-2 border border-gray-100 rounded-xl overflow-hidden">
                  <div className="p-3 border-r border-b border-gray-100">
                    <p className="text-xs text-gray-400 mb-0.5">{t('category')}</p>
                    <p className="text-sm font-semibold text-gray-800">{transaction.category}</p>
                  </div>
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-xs text-gray-400 mb-0.5">{t('type')}</p>
                    <p className="text-sm font-semibold text-gray-800">{transaction.type === 'income' ? t('income') : t('expense')}</p>
                  </div>
                  <div className="p-3 border-r border-gray-100">
                    <p className="text-xs text-gray-400 mb-0.5">{t('date')}</p>
                    <p className="text-sm font-semibold text-gray-800">{formatDateDisplay(transaction.date)}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Time</p>
                    <p className="text-sm font-semibold text-gray-800">{formatTimeDisplay(transaction.created_at)}</p>
                  </div>
                </div>
                {transaction.note ? (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-0.5">Note</p>
                    <p className="text-sm text-gray-700">{transaction.note}</p>
                  </div>
                ) : null}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditing(true)} className="border border-teal-500 text-teal-600 rounded-xl flex-1 py-2.5"><Edit className="w-4 h-4 mr-2" />{t('edit')}</Button>
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogTrigger asChild><Button className="bg-red-500 hover:bg-red-600 text-white rounded-xl flex-1 py-2.5"><Trash2 className="w-4 h-4 mr-2" />{t('delete')}</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle><AlertDialogDescription>{t('deleteConfirmMessage')}</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">{t('delete')}</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
