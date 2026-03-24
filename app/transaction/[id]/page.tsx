'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Edit, Printer, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactionById, updateTransaction, deleteTransaction } from '@/lib/db'
import { getCategoriesByType, getCategoryByName } from '@/lib/categories'
import { cn, formatIndianCurrency, formatIST } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Transaction } from '@/lib/types'

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
                  <p className={cn("text-4xl font-bold", transaction.type === 'income' ? "text-emerald-600" : "text-orange-600")}>
                    {transaction.type === 'income' ? '+' : '-'}{formatIndianCurrency(transaction.amount)}
                  </p>
                  <span className={cn("inline-block mt-2 px-3 py-1 rounded-full text-sm", transaction.type === 'income' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700")}>
                    {transaction.type === 'income' ? t('income') : t('expense')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-gray-500">{t('category')}</p><div className="flex items-center gap-2 mt-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat?.color }} /><span className="font-medium">{cat?.name}</span></div></div>
                  <div><p className="text-sm text-gray-500">{t('date')}</p><p className="font-medium">{transaction.date}</p></div>
                  <div><p className="text-sm text-gray-500">Created At</p><p className="font-medium">{formatIST(transaction.created_at)}</p></div>
                </div>
                <div><p className="text-sm text-gray-500">{t('description')}</p><p className="font-medium">{transaction.note}</p></div>
                <div className="flex flex-wrap gap-2 no-print">
                  <Button variant="outline" onClick={() => setEditing(true)} className="border-gray-200"><Edit className="w-4 h-4 mr-2" />{t('edit')}</Button>
                  <Button variant="outline" onClick={() => window.print()} className="border-gray-200"><Printer className="w-4 h-4 mr-2" />{t('print')}</Button>
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="w-4 h-4 mr-2" />{t('delete')}</Button></AlertDialogTrigger>
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
