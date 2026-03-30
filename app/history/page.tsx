'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Clock, Trash2, Utensils, Car, ShoppingBag, Zap, Film, Heart, GraduationCap, Building, ShoppingCart, Sparkles, Briefcase, Wallet, Gift, CircleDot, TrendingUp, Download, FileSpreadsheet, FileText, X, Filter, Search, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
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
  const [selectionMode, setSelectionMode] = useState(false)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

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

  const perPage = 20
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const handleDeleteSelected = async () => {
    const count = selectedIds.length
    await deleteTransactions(selectedIds)
    const data = await getTransactions()
    setTransactions(data)
    setSelectedIds([])
    setDeleteDialogOpen(false)
    setSelectionMode(false)
    toast.success(`${count} transaction${count !== 1 ? 's' : ''} deleted`)
  }

  const isFilterActive = appliedFromDate !== '' || appliedToDate !== '' || categoryFilter !== 'all'

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedIds([])
  }

  const selectAll = () => {
    setSelectedIds(paginated.map(tx => tx.id))
  }

  return (
    <Layout>
      <div className="space-y-3">
        {/* Page header */}
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
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-b-lg"
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  Export as PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter / type row */}
        {selectionMode ? (
          <div className="flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">{selectedIds.length} selected</span>
              <button
                onClick={selectAll}
                className="text-xs text-teal-600 font-medium px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors"
              >
                Select All
              </button>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete {selectedIds.length}
                </button>
              )}
              <button
                onClick={exitSelectionMode}
                className="text-sm font-medium text-gray-600 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between no-print">
            {/* Pill type tabs */}
            <div className="flex gap-1.5">
              {(['all', 'income', 'expense'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setTypeFilter(f); setPage(1) }}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap',
                    typeFilter === f
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {f === 'all' ? t('all') : f === 'income' ? t('income') : t('expense')}
                </button>
              ))}
            </div>
            {/* Icon buttons */}
            <div className="flex gap-1.5">
              {/* Filter */}
              <button
                onClick={() => { setFilterPanelOpen(p => !p); setSearchOpen(false) }}
                className={cn(
                  'relative bg-gray-100 rounded-xl p-2.5 transition-colors hover:bg-gray-200',
                  filterPanelOpen && 'bg-teal-50'
                )}
              >
                <Filter className="w-4 h-4 text-gray-600" />
                {isFilterActive && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500" />
                )}
              </button>
              {/* Search */}
              <button
                onClick={() => { setSearchOpen(p => !p); setFilterPanelOpen(false) }}
                className={cn(
                  'bg-gray-100 rounded-xl p-2.5 transition-colors hover:bg-gray-200',
                  searchOpen && 'bg-teal-50'
                )}
              >
                <Search className="w-4 h-4 text-gray-600" />
              </button>
              {/* Select */}
              <button
                onClick={() => { setSelectionMode(true); setSelectedIds([]) }}
                className="bg-gray-100 rounded-xl p-2.5 transition-colors hover:bg-gray-200"
              >
                <CheckSquare className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}

        {/* Search bar */}
        {searchOpen && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-teal-500 px-3 transition-colors no-print">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              className="flex-1 py-2.5 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
            />
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(''); setPage(1) }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter panel */}
        {filterPanelOpen && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3 no-print">
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="border-gray-200 h-10 text-sm w-full"><SelectValue placeholder={t('category')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')} {t('category')}</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl h-10 px-3 text-sm bg-gray-50 outline-none focus:border-teal-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl h-10 px-3 text-sm bg-gray-50 outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>
            <button
              onClick={() => { applyDateFilter(); setFilterPanelOpen(false) }}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              Apply Filter
            </button>
            {isFilterActive && (
              <button
                onClick={() => { clearDateFilter(); setCategoryFilter('all'); setPage(1) }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Transaction list */}
        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {paginated.length === 0 ? (
              <div className="p-8 text-center text-gray-500"><Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="font-medium">{t('noResults')}</p></div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paginated.map((tx) => {
                  const category = getCategoryByName(tx.category)
                  const isSelected = selectedIds.includes(tx.id)
                  return (
                    <div
                      key={tx.id}
                      className={cn(
                        'flex items-center gap-2 p-3 transition-colors',
                        isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'
                      )}
                    >
                      {selectionMode && (
                        <button
                          className={cn(
                            'w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors',
                            isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'
                          )}
                          onClick={() => setSelectedIds(isSelected ? selectedIds.filter(id => id !== tx.id) : [...selectedIds, tx.id])}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (selectionMode) {
                            setSelectedIds(isSelected ? selectedIds.filter(id => id !== tx.id) : [...selectedIds, tx.id])
                          } else {
                            router.push(`/transaction/${tx.id}`)
                          }
                        }}
                        className="flex-1 flex items-center gap-2.5 min-w-0"
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${category?.color}20` }}>
                          <span style={{ color: category?.color }}>{categoryIcons[tx.category] || categoryIcons['Other']}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">{tx.note || tx.category}</p>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transactions?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} transaction{selectedIds.length !== 1 ? 's' : ''}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 font-medium hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 font-medium transition-colors"
            >
              Yes, Delete {selectedIds.length}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default function HistoryPage() {
  return <Suspense fallback={<LoadingScreen />}><HistoryContent /></Suspense>
}
