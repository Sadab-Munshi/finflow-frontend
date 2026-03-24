'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Clock, Trash2, Utensils, Car, ShoppingBag, Zap, Film, Heart, GraduationCap, Building, ShoppingCart, Sparkles, Briefcase, Wallet, Gift, CircleDot, TrendingUp, Download, FileSpreadsheet, FileText, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactions, deleteTransactions } from '@/lib/db'
import { categories, getCategoryByName } from '@/lib/categories'
import { cn, formatIndianCurrency, formatIST, normalizeDateToYMD } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Transaction } from '@/lib/types'
import toast from 'react-hot-toast'

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

function HistoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all'|'income'|'expense'>((searchParams.get('type') as 'all'|'income'|'expense'|null) || 'all')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedFromDate, setAppliedFromDate] = useState('')
  const [appliedToDate, setAppliedToDate] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const data = await getTransactions()
      setTransactions(data)
      setLoading(false)
      setMounted(true)
    }
    load()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  if (loading) return <LoadingScreen />
  if (!mounted) return null

  const getTxDate = (tx: Transaction) => tx.created_at ?? tx.date

  const filtered = transactions.filter(tx => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false
    if (categoryFilter !== 'all' && tx.category.trim().toLowerCase() !== categoryFilter.trim().toLowerCase()) return false
    if (searchQuery && !tx.note.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (appliedFromDate || appliedToDate) {
      const txDate = normalizeDateToYMD(getTxDate(tx))
      if (appliedFromDate && txDate < appliedFromDate) return false
      if (appliedToDate && txDate > appliedToDate) return false
    }
    return true
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const applyDateFilter = () => {
    setAppliedFromDate(fromDate)
    setAppliedToDate(toDate)
    setPage(1)
  }

  const clearDateFilter = () => {
    setFromDate('')
    setToDate('')
    setAppliedFromDate('')
    setAppliedToDate('')
    setPage(1)
  }

  const handleExportCSV = () => {
    setDropdownOpen(false)
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount']
    const rows = filtered.map(tx => [
      formatIST(getTxDate(tx)),
      tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
      tx.category,
      tx.note,
      tx.type === 'income' ? tx.amount : -tx.amount,
    ])
    const escape = (v: unknown) => {
      const s = String(v)
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csvLines = [
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(',')),
    ]
    // BOM (\uFEFF) ensures Excel correctly reads UTF-8 (e.g. ₹ symbol)
    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FinFlow_Transactions_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    setDropdownOpen(false)
    const { default: JsPDFClass } = await import('jspdf')
    // jspdf v4.x ships its own types; cast to access constructor cleanly
    const doc = new (JsPDFClass as unknown as new (opts: Record<string, unknown>) => Record<string, (...args: unknown[]) => unknown>)({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // A4 portrait: 210mm × 297mm
    const pageW = 210
    const pageH = 297
    const margin = 20
    const contentW = pageW - margin * 2 // 170mm
    const rowH = 8

    // Column widths by percentage of content width
    const colW = [
      contentW * 0.22, // Date:        37.4mm
      contentW * 0.10, // Type:        17mm
      contentW * 0.18, // Category:    30.6mm
      contentW * 0.25, // Description: 42.5mm
      contentW * 0.25, // Amount:      42.5mm
    ]
    // Cumulative X positions
    const colX = [
      margin,
      margin + colW[0],
      margin + colW[0] + colW[1],
      margin + colW[0] + colW[1] + colW[2],
      margin + colW[0] + colW[1] + colW[2] + colW[3],
    ]

    const generatedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

    // ── Title ──────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(20, 184, 166) // teal #14b8a6
    doc.text('FinFlow Transactions', margin, margin + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated on ${generatedDate}`, margin, margin + 15)

    // ── Header row ─────────────────────────────────────────────────────
    const drawHeaderRow = (startY: number) => {
      doc.setFillColor(20, 184, 166)
      doc.rect(margin, startY, contentW, rowH, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)
      const hdrs = ['Date', 'Type', 'Category', 'Description', 'Amount (Rs.)']
      hdrs.forEach((h, i) => {
        if (i === 4) {
          doc.text(h, colX[i] + colW[i] - 3, startY + 5.5, { align: 'right' })
        } else {
          doc.text(h, colX[i] + 3, startY + 5.5)
        }
      })
    }

    let y = margin + 22
    drawHeaderRow(y)
    y += rowH

    // ── Data rows ──────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)

    filtered.forEach((tx, idx) => {
      // Leave 15mm at the bottom for the page-number footer
      if (y > pageH - margin - 15) {
        doc.addPage()
        y = margin
        drawHeaderRow(y)
        y += rowH
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
      }

      // Alternating row background
      doc.setFillColor(idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 251)
      doc.rect(margin, y, contentW, rowH, 'F')

      // Cell borders
      doc.setDrawColor(220, 220, 220)
      colX.forEach((x, i) => doc.rect(x, y, colW[i], rowH, 'S'))

      const dateStr = formatIST(getTxDate(tx))
      const typeStr = tx.type.charAt(0).toUpperCase() + tx.type.slice(1)
      const desc = tx.note.length > 30 ? tx.note.slice(0, 30) + '...' : tx.note
      const amountStr = (tx.type === 'income' ? '+' : '-') + Math.abs(tx.amount).toLocaleString('en-IN')

      doc.setTextColor(55, 65, 81)
      doc.text(dateStr, colX[0] + 3, y + 5.5)
      doc.text(typeStr, colX[1] + 3, y + 5.5)
      doc.text(tx.category, colX[2] + 3, y + 5.5)
      doc.text(desc, colX[3] + 3, y + 5.5)

      // Amount: colour-coded and right-aligned
      if (tx.type === 'income') {
        doc.setTextColor(22, 163, 74)  // green
      } else {
        doc.setTextColor(225, 29, 72)  // red
      }
      doc.text(amountStr, colX[4] + colW[4] - 3, y + 5.5, { align: 'right' })

      y += rowH
    })

    // ── Page numbers ───────────────────────────────────────────────────
    const totalPgs = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
    for (let p = 1; p <= totalPgs; p++) {
      ;(doc as unknown as { setPage: (n: number) => void }).setPage(p)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Page ${p} of ${totalPgs}`, pageW / 2, pageH - 8, { align: 'center' })
    }

    const filename = `FinFlow_Transactions_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
  }

  const handleShare = async () => {
    setDropdownOpen(false)
    const totalIncome = filtered.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
    const totalExpense = filtered.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)
    const balance = totalIncome - totalExpense
    const shareText = `FinFlow Transaction Summary\n\nTransactions: ${filtered.length}\nTotal Income: ₹${totalIncome.toLocaleString('en-IN')}\nTotal Expenses: ₹${totalExpense.toLocaleString('en-IN')}\nBalance: ₹${balance.toLocaleString('en-IN')}\n\nExported from FinFlow`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FinFlow Transactions', text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
        toast.success('Summary copied to clipboard!')
      }
    } catch {
      await navigator.clipboard.writeText(shareText)
      toast.success('Summary copied to clipboard!')
    }
  }

  const perPage = 20
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const handleDeleteSelected = async () => {
    await deleteTransactions(selectedIds)
    const data = await getTransactions()
    setTransactions(data)
    setSelectedIds([])
    setDeleteDialogOpen(false)
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{t('history')}</h1>
          <div className="relative" ref={dropdownRef}>
            <Button
              size="sm"
              onClick={() => setDropdownOpen(prev => !prev)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-t-lg"
                >
                  <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                  Export as CSV (.csv)
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700"
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  Export as PDF (.pdf)
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 border-t border-gray-100 rounded-b-lg"
                >
                  <Share2 className="w-4 h-4 flex-shrink-0" />
                  Share
                </button>
              </div>
            )}
          </div>
        </div>

        <Card className="no-print border-gray-200 shadow-sm">
          <CardContent className="p-3 space-y-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(['all', 'income', 'expense'] as const).map((f) => (
                <Button key={f} variant={typeFilter === f ? 'default' : 'outline'} size="sm"
                  onClick={() => { setTypeFilter(f); setPage(1) }}
                  className={cn("text-xs px-3 whitespace-nowrap", typeFilter === f ? 'bg-teal-600 hover:bg-teal-700' : 'border-gray-200 text-gray-600')}>
                  {f === 'all' ? t('all') : f === 'income' ? t('income') : t('expense')}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
                <SelectTrigger className="border-gray-200 h-9 text-sm"><SelectValue placeholder={t('category')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')} {t('category')}</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder={t('search')} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }} className="border-gray-200 h-9 text-sm" />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="border border-gray-200 rounded-md h-9 px-2 text-sm bg-white min-w-[120px]"
                placeholder="From Date"
              />
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="border border-gray-200 rounded-md h-9 px-2 text-sm bg-white min-w-[120px]"
                placeholder="To Date"
              />
              <Button size="sm" onClick={applyDateFilter} className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9">
                Apply Filter
              </Button>
              {(appliedFromDate || appliedToDate) && (
                <Button size="sm" variant="outline" onClick={clearDateFilter} className="border-gray-200 text-gray-600 h-9 px-2">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-teal-100 rounded-xl no-print">
            <span className="font-medium text-teal-800 text-sm">{selectedIds.length} {t('selected')}</span>
            <div className="flex gap-2">
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="text-xs"><Trash2 className="w-3.5 h-3.5 mr-1.5" /> {t('delete')}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('deleteConfirmMessage')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSelected} className="bg-red-500 hover:bg-red-600">{t('delete')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {paginated.length === 0 ? (
              <div className="p-8 text-center text-gray-500"><Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="font-medium">{t('noResults')}</p></div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paginated.map((tx) => {
                  const category = getCategoryByName(tx.category)
                  return (
                    <div key={tx.id} className="flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors">
                      <Checkbox checked={selectedIds.includes(tx.id)} className="no-print flex-shrink-0"
                        onCheckedChange={(checked) => setSelectedIds(checked ? [...selectedIds, tx.id] : selectedIds.filter(id => id !== tx.id))} />
                      <button onClick={() => router.push(`/transaction/${tx.id}`)} className="flex-1 flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${category?.color}20` }}>
                          <span style={{ color: category?.color }}>{categoryIcons[tx.category] || categoryIcons['Other']}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">{tx.note}</p>
                          <p className="text-xs text-gray-500">{formatIST(tx.created_at)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("font-bold text-sm", tx.type === 'income' ? "text-green-600" : "text-rose-600")}>
                            {tx.type === 'income' ? '+' : '-'}{formatIndianCurrency(tx.amount)}
                          </p>
                          <p className="text-[10px] text-gray-400 capitalize">{category?.name}</p>
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 no-print pb-4">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="border-gray-200 text-sm">{t('previous')}</Button>
            <span className="flex items-center px-3 text-sm text-gray-600 bg-white rounded-md border border-gray-200">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)} className="border-gray-200 text-sm">{t('next')}</Button>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default function HistoryPage() {
  return <Suspense fallback={<LoadingScreen />}><HistoryContent /></Suspense>
}
