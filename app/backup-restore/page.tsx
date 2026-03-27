'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  FileSpreadsheet, FileJson, FileCheck,
  Upload, GitMerge, RefreshCw,
  AlertTriangle, Info, ArrowLeft,
  Loader2, CheckCircle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { getTransactions, getBudgets, getSettings, addTransaction, deleteBudget, upsertBudget, deleteTransactions } from '@/lib/db'
import { useUser } from '@/context/UserContext'
import { createClient } from '@/lib/supabase/client'
import { Transaction, Budget } from '@/lib/types'
import { categories } from '@/lib/categories'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportPreview {
  fileName: string
  fileType: 'csv' | 'json'
  transactionCount: number
  budgetCount: number
  categoryCount: number
  dateRange: { earliest: string; latest: string } | null
}

interface JsonBackup {
  exportedAt: string
  version: string
  user: { name: string; email: string }
  transactions: Transaction[]
  budgets: Budget[]
  categories: { id: number; name: string; type: string }[]
  settings: Record<string, unknown>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateForFilename(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Escape a CSV cell value, wrapping in quotes if necessary. */
function csvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Parse a simple CSV string into rows of cells. Handles quoted fields. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let inQuote = false
    let cell = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuote = !inQuote
        }
      } else if (ch === ',' && !inQuote) {
        cells.push(cell)
        cell = ''
      } else {
        cell += ch
      }
    }
    cells.push(cell)
    rows.push(cells)
  }
  return rows
}

/** Sanitize a string to prevent injection — strips control characters. */
function sanitize(value: string): string {
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BackupRestorePage() {
  const router = useRouter()
  const { user } = useUser()
  const [authChecked, setAuthChecked] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [isExportingJson, setIsExportingJson] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [parsedData, setParsedData] = useState<{ transactions: Transaction[]; budgets: Budget[] } | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [isImporting, setIsImporting] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
      setAuthChecked(true)
    }
    checkAuth()
  }, [router])

  if (!authChecked) return null

  // ── Export CSV ──────────────────────────────────────────────────────────────

  async function handleExportCsv() {
    setIsExportingCsv(true)
    try {
      const transactions = await getTransactions()
      if (!transactions.length) {
        toast('No transactions to export.', { icon: 'ℹ️' })
        return
      }
      const header = ['Date', 'Category', 'Amount', 'Type', 'Note'].map(csvCell).join(',')
      const rows = transactions.map(t =>
        [t.date, t.category, t.amount, t.type, t.note ?? ''].map(csvCell).join(',')
      )
      const csv = [header, ...rows].join('\n')
      triggerDownload(csv, `finflow-backup-${formatDateForFilename()}.csv`, 'text/csv;charset=utf-8;')
      toast.success('CSV exported successfully')
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setIsExportingCsv(false)
    }
  }

  // ── Export JSON ─────────────────────────────────────────────────────────────

  async function handleExportJson() {
    setIsExportingJson(true)
    try {
      const [transactions, budgets, settings] = await Promise.all([
        getTransactions(),
        getBudgets(),
        getSettings(),
      ])
      const backup: JsonBackup = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        user: { name: user?.userName ?? '', email: user?.email ?? '' },
        transactions,
        budgets,
        categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
        settings: (settings ?? {}) as Record<string, unknown>,
      }
      triggerDownload(JSON.stringify(backup, null, 2), `finflow-backup-${formatDateForFilename()}.json`, 'application/json')
      toast.success('JSON exported successfully')
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setIsExportingJson(false)
    }
  }

  // ── File parsing ─────────────────────────────────────────────────────────────

  async function parseAndPreviewFile(file: File) {
    // Security: validate file size (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File is too large. Maximum allowed size is 10 MB.')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'json') {
      toast.error('Unsupported file format. Please use .csv or .json.')
      return
    }

    try {
      const text = await file.text()
      const txns: Transaction[] = []
      const bgts: Budget[] = []

      if (ext === 'csv') {
        const rows = parseCsv(text)
        if (rows.length < 2) {
          toast.error('CSV file appears to be empty or invalid.')
          return
        }
        const header = rows[0].map(h => h.toLowerCase().trim())
        const dateIdx = header.indexOf('date')
        const catIdx = header.indexOf('category')
        const amtIdx = header.indexOf('amount')
        const typeIdx = header.indexOf('type')
        const noteIdx = header.indexOf('note')

        if (dateIdx === -1 || catIdx === -1 || amtIdx === -1 || typeIdx === -1) {
          toast.error('CSV must have Date, Category, Amount, and Type columns.')
          return
        }

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          const rawType = sanitize(row[typeIdx] ?? '').toLowerCase()
          const rawAmount = parseFloat(row[amtIdx] ?? '')
          const rawDate = sanitize(row[dateIdx] ?? '')
          const rawCategory = sanitize(row[catIdx] ?? '')

          if (!['income', 'expense'].includes(rawType)) continue
          if (isNaN(rawAmount) || rawAmount <= 0) continue
          if (!rawDate || !rawCategory) continue

          txns.push({
            id: '',
            user_id: user?.userId ?? '',
            amount: rawAmount,
            type: rawType as 'income' | 'expense',
            category: rawCategory,
            note: noteIdx !== -1 ? sanitize(row[noteIdx] ?? '') : '',
            date: rawDate,
            created_at: new Date().toISOString(),
          })
        }
      } else {
        // JSON
        let backup: Partial<JsonBackup>
        try {
          backup = JSON.parse(text) as Partial<JsonBackup>
        } catch {
          toast.error('Invalid JSON file.')
          return
        }

        // Validate version
        if (backup.version && backup.version !== '1.0') {
          toast.error('Unsupported backup version.')
          return
        }

        // Parse transactions
        if (Array.isArray(backup.transactions)) {
          for (const t of backup.transactions) {
            if (!t || typeof t !== 'object') continue
            const rawType = String(t.type ?? '').toLowerCase()
            const rawAmount = parseFloat(String(t.amount ?? ''))
            const rawDate = sanitize(String(t.date ?? ''))
            const rawCategory = sanitize(String(t.category ?? ''))
            if (!['income', 'expense'].includes(rawType)) continue
            if (isNaN(rawAmount) || rawAmount <= 0) continue
            if (!rawDate || !rawCategory) continue
            txns.push({
              id: '',
              user_id: user?.userId ?? '',
              amount: rawAmount,
              type: rawType as 'income' | 'expense',
              category: rawCategory,
              note: sanitize(String(t.note ?? '')),
              date: rawDate,
              created_at: new Date().toISOString(),
            })
          }
        }

        // Parse budgets
        if (Array.isArray(backup.budgets)) {
          for (const b of backup.budgets) {
            if (!b || typeof b !== 'object') continue
            const rawCategory = sanitize(String(b.category ?? ''))
            const rawAmount = parseFloat(String(b.amount ?? ''))
            const rawMonth = sanitize(String(b.month ?? ''))
            if (!rawCategory || isNaN(rawAmount) || rawAmount <= 0 || !rawMonth) continue
            bgts.push({
              id: '',
              user_id: user?.userId ?? '',
              category: rawCategory,
              amount: rawAmount,
              month: rawMonth,
              created_at: new Date().toISOString(),
            })
          }
        }
      }

      if (txns.length === 0 && bgts.length === 0) {
        toast.error('No valid data found in file.')
        return
      }

      // Compute date range
      const dates = txns.map(t => t.date).filter(Boolean).sort()
      const dateRange = dates.length > 0
        ? { earliest: dates[0], latest: dates[dates.length - 1] }
        : null

      // Count unique categories
      const uniqueCategories = new Set(txns.map(t => t.category)).size

      setParsedData({ transactions: txns, budgets: bgts })
      setImportPreview({
        fileName: file.name,
        fileType: ext as 'csv' | 'json',
        transactionCount: txns.length,
        budgetCount: bgts.length,
        categoryCount: uniqueCategories,
        dateRange,
      })
    } catch {
      toast.error('Failed to read file. Please try again.')
    }
  }

  // ── File input handlers ──────────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseAndPreviewFile(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDraggingOver(true)
  }

  function handleDragLeave() {
    setIsDraggingOver(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDraggingOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseAndPreviewFile(file)
  }

  // ── Import ───────────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!parsedData) return
    setIsImporting(true)
    try {
      const { transactions: txns, budgets: bgts } = parsedData

      if (importMode === 'replace') {
        // Delete all existing transactions
        const existing = await getTransactions()
        if (existing.length > 0) {
          await deleteTransactions(existing.map(t => t.id))
        }
        // Delete all existing budgets
        const existingBudgets = await getBudgets()
        for (const b of existingBudgets) {
          await deleteBudget(b.id)
        }
      }

      // Import transactions
      let imported = 0
      for (const t of txns) {
        const result = await addTransaction({
          user_id: user?.userId ?? '',
          amount: t.amount,
          type: t.type,
          category: t.category,
          note: t.note ?? '',
          date: t.date,
        })
        if (result) imported++
      }

      // Import budgets
      for (const b of bgts) {
        await upsertBudget({
          user_id: user?.userId ?? '',
          category: b.category,
          amount: b.amount,
          month: b.month,
        })
      }

      toast.success(`Data imported successfully (${imported} transaction${imported !== 1 ? 's' : ''} added)`)
      setImportPreview(null)
      setParsedData(null)
      setImportMode('merge')
    } catch {
      toast.error('Import failed. Please check your file format.')
    } finally {
      setIsImporting(false)
    }
  }

  function resetImport() {
    setImportPreview(null)
    setParsedData(null)
    setImportMode('merge')
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto px-4 pb-24">

        {/* Header */}
        <div className="flex items-center gap-3 pt-5 pb-4">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Backup & Restore</h1>
        </div>

        {/* ── SECTION 1 — BACKUP ─────────────────────────────────────── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Backup Your Data
        </p>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          {/* Info card */}
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 mb-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="text-xs text-teal-700 leading-relaxed">
              Export a copy of your data for safekeeping. You can restore it at any time using the Restore section below.
            </p>
          </div>

          {/* Export buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              disabled={isExportingCsv}
              className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-2xl hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isExportingCsv ? (
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-8 h-8 text-teal-500" />
              )}
              <span className="text-sm font-semibold text-gray-700">Export CSV</span>
              <span className="text-xs text-gray-400 text-center">Transactions only</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={handleExportJson}
              disabled={isExportingJson}
              className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-2xl hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isExportingJson ? (
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              ) : (
                <FileJson className="w-8 h-8 text-teal-500" />
              )}
              <span className="text-sm font-semibold text-gray-700">Export JSON</span>
              <span className="text-xs text-gray-400 text-center">Full data with all settings</span>
            </button>
          </div>
        </div>

        {/* ── SECTION 2 — RESTORE ────────────────────────────────────── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">
          Restore Data
        </p>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          {/* Warning banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Importing data may overwrite your existing records. We recommend exporting a backup first.
            </p>
          </div>

          {/* Drop zone or Preview */}
          {!importPreview ? (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDraggingOver
                    ? 'border-teal-400 bg-teal-50'
                    : 'border-gray-200 hover:border-teal-400 hover:bg-teal-50'
                }`}
              >
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">Drop your backup file here</p>
                <p className="text-xs text-gray-400 mt-1">Supports .csv and .json files</p>
                <button
                  type="button"
                  className="mt-3 text-xs text-teal-600 font-medium border border-teal-300 rounded-full px-4 py-1.5 hover:bg-teal-50"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                >
                  Browse File
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleFileSelect}
              />
            </>
          ) : (
            /* Import Preview Card */
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mt-3">
              {/* Preview header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {importPreview.fileType === 'csv' ? (
                    <FileSpreadsheet className="w-5 h-5 text-teal-500 shrink-0" />
                  ) : (
                    <FileJson className="w-5 h-5 text-teal-500 shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-gray-700">
                    <FileCheck className="w-4 h-4 text-green-500 inline mr-1" />
                    File ready to import
                  </span>
                </div>
                <button
                  onClick={resetImport}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Change
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{importPreview.fileName}</p>

              {/* Preview stats */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-800">{importPreview.transactionCount}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Transactions found</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-sm font-bold text-gray-800">
                    {importPreview.dateRange
                      ? `${importPreview.dateRange.earliest} → ${importPreview.dateRange.latest}`
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Date range</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-800">{importPreview.budgetCount}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Budgets</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-800">{importPreview.categoryCount}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Categories</p>
                </div>
              </div>

              {/* Import mode */}
              <p className="text-sm font-semibold text-gray-700 mt-4 mb-2">Import Mode</p>
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => setImportMode('merge')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                    importMode === 'merge' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                  }`}
                >
                  <GitMerge className="w-5 h-5 mx-auto mb-1 text-teal-600" />
                  <p className="text-sm font-semibold">Merge</p>
                  <p className="text-xs text-gray-400 mt-0.5">Add to existing data</p>
                </div>
                <div
                  onClick={() => setImportMode('replace')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                    importMode === 'replace' ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <RefreshCw className="w-5 h-5 mx-auto mb-1 text-red-500" />
                  <p className="text-sm font-semibold">Replace</p>
                  <p className="text-xs text-gray-400 mt-0.5">Overwrite all data</p>
                </div>
              </div>

              {importMode === 'replace' && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  This will delete all your current data
                </p>
              )}

              {/* Import button */}
              <button
                onClick={handleImport}
                disabled={isImporting}
                className={`w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 mt-4 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  importMode === 'replace'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {importMode === 'merge' ? 'Merge & Import Data' : 'Replace & Import Data'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}
