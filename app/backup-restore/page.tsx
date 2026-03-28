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
import { getTransactions, getBudgets, addTransaction, deleteBudget, upsertBudget, deleteTransactions } from '@/lib/db'
import { useUser } from '@/context/UserContext'
import { createClient } from '@/lib/supabase/client'
import { Transaction, Budget } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportPreview {
  fileName: string
  fileSize: number
  fileType: 'csv' | 'json'
  transactionCount: number
  budgetCount: number
  categoryCount: number
  dateRange: { earliest: string; latest: string } | null
}

interface JsonBackup {
  exportedAt: string
  version: string
  transactions: { amount: number; type: 'income' | 'expense'; category: string; note: string; date: string }[]
  budgets: { category: string; amount: number; month: string }[]
}

interface SanitizedTransaction {
  amount: number
  type: 'income' | 'expense'
  category: string
  note: string
  date: string
}

interface SanitizedBudget {
  amount: number
  category: string
  month: string
}

interface SanitizedImport {
  transactions: SanitizedTransaction[]
  budgets: SanitizedBudget[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateForFilename(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

// ─── Import sanitization constants ───────────────────────────────────────────

const VALID_TYPES = ['expense', 'income'] as const

const VALID_CATEGORIES = [
  'Food & Dining', 'Transport', 'Shopping',
  'Bills & Utilities', 'Entertainment', 'Health',
  'Education', 'Rent', 'Groceries', 'Personal Care',
  'Salary', 'Freelance', 'Business', 'Investment',
  'Gift', 'Other',
]

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const MONTH_REGEX = /^\d{4}-\d{2}$/

const MAX_FILE_SIZE = 5 * 1024 * 1024   // 5 MB
const MAX_AMOUNT = 10_000_000
const MAX_TRANSACTIONS = 10_000
const MAX_BUDGETS = 100

const DANGEROUS_KEYS = [
  'user_id', 'is_admin', 'avatar_url',
  'telegram', 'whatsapp', 'settings',
  '__proto__', 'constructor', 'prototype',
  'eval', 'script', 'exec', 'system',
]

function sanitizeText(str: unknown): string {
  if (!str) return ''
  return String(str)
    .replace(/[<>"'`]/g, '')       // strip all HTML-bracket and quote chars
    .replace(/javascript:/gi, '')  // strip js: protocol
    .replace(/vbscript:/gi, '')    // strip vbscript: protocol
    .replace(/data:/gi, '')        // strip data: protocol
    .trim()
    .slice(0, 200)                 // max 200 chars
}

function sanitizeImportedJSON(raw: string): SanitizedImport {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    throw new Error('Invalid JSON file')
  }

  if (!parsed.transactions && !parsed.budgets) {
    throw new Error('No valid data found in file')
  }

  const rawStr = JSON.stringify(parsed).toLowerCase()
  for (const key of DANGEROUS_KEYS) {
    if (rawStr.includes(key.toLowerCase())) {
      throw new Error(`File contains unauthorized field: ${key}`)
    }
  }

  const sanitizedTransactions: SanitizedTransaction[] = (
    Array.isArray(parsed.transactions) ? parsed.transactions : []
  )
    .slice(0, MAX_TRANSACTIONS)
    .map((t: Record<string, unknown>, index: number) => {
      const amount = Number(t.amount)
      if (isNaN(amount) || amount <= 0 || amount > MAX_AMOUNT) {
        throw new Error(`Invalid amount at transaction ${index + 1}`)
      }
      if (!VALID_TYPES.includes(t.type as 'income' | 'expense')) {
        throw new Error(`Invalid type at transaction ${index + 1}`)
      }
      if (!VALID_CATEGORIES.includes(t.category as string)) {
        throw new Error(`Unknown category at transaction ${index + 1}`)
      }
      if (!DATE_REGEX.test(t.date as string)) {
        throw new Error(`Invalid date at transaction ${index + 1}`)
      }
      return {
        amount,
        type: t.type as 'income' | 'expense',
        category: t.category as string,
        note: sanitizeText(t.note),
        date: t.date as string,
      }
    })

  const sanitizedBudgets: SanitizedBudget[] = (
    Array.isArray(parsed.budgets) ? parsed.budgets : []
  )
    .slice(0, MAX_BUDGETS)
    .map((b: Record<string, unknown>, index: number) => {
      const amount = Number(b.amount)
      if (isNaN(amount) || amount <= 0 || amount > MAX_AMOUNT) {
        throw new Error(`Invalid budget amount at index ${index + 1}`)
      }
      if (!VALID_CATEGORIES.includes(b.category as string)) {
        throw new Error(`Unknown budget category at index ${index + 1}`)
      }
      if (!MONTH_REGEX.test(b.month as string)) {
        throw new Error(`Invalid month format at budget ${index + 1}`)
      }
      return {
        amount,
        category: b.category as string,
        month: b.month as string,
      }
    })

  return { transactions: sanitizedTransactions, budgets: sanitizedBudgets }
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

function sanitizeImportedCSV(raw: string): SanitizedImport {
  // 1. Normalize line endings
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows')
  }

  // 2. Parse headers: case-insensitive, trimmed, unquoted
  const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, '').trim().toLowerCase())
  const requiredHeaders = ['date', 'type', 'category', 'amount']
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
  if (missingHeaders.length > 0) {
    throw new Error(`Missing columns: ${missingHeaders.join(', ')}`)
  }

  const hasNoteColumn = headers.includes('note')

  const transactions: SanitizedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    // 3. Skip completely empty rows
    if (!line.trim()) continue
    if (transactions.length >= MAX_TRANSACTIONS) break

    // 4. Parse with quoted field support
    const cols = parseCSVLine(line).map(c => c.trim().replace(/^"|"$/g, '').trim())
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = cols[idx] || '' })

    const amount = Number(row.amount)
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Invalid amount on row ${i + 1}`)
    }
    if (!VALID_TYPES.includes(row.type as 'income' | 'expense')) {
      throw new Error(`Invalid type on row ${i + 1}`)
    }
    if (!DATE_REGEX.test(row.date)) {
      throw new Error(`Invalid date on row ${i + 1}`)
    }

    transactions.push({
      amount,
      type: row.type as 'income' | 'expense',
      category: row.category || 'Other',
      // 5. Default note to empty string if column missing
      note: sanitizeText(hasNoteColumn ? row.note : ''),
      date: row.date,
    })
  }

  // 8. Error if zero valid rows
  if (transactions.length === 0) {
    throw new Error('No valid transactions found in this CSV file.')
  }

  return { transactions, budgets: [] }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BackupRestorePage() {
  const router = useRouter()
  const { user } = useUser()
  const [authChecked, setAuthChecked] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [isExportingJson, setIsExportingJson] = useState(false)
  const [csvExportSuccess, setCsvExportSuccess] = useState(false)
  const [jsonExportSuccess, setJsonExportSuccess] = useState(false)
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
      const headers = ['Date', 'Type', 'Category', 'Amount', 'Note']
      const rows = transactions.map(t => [
        t.date,
        t.type,
        t.category,
        t.amount,
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ])
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      triggerDownload(csv, `finflow-backup-${formatDateForFilename()}.csv`, 'text/csv;charset=utf-8;')
      setCsvExportSuccess(true)
      setTimeout(() => setCsvExportSuccess(false), 2000)
    } catch {
      toast.error('Export failed, try again.')
    } finally {
      setIsExportingCsv(false)
    }
  }

  // ── Export JSON ─────────────────────────────────────────────────────────────

  async function handleExportJson() {
    setIsExportingJson(true)
    try {
      const [rawTransactions, rawBudgets] = await Promise.all([
        getTransactions(),
        getBudgets(),
      ])
      const sanitizedExport: JsonBackup = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        transactions: rawTransactions.map(t => ({
          amount: t.amount,
          type: t.type,
          category: t.category,
          note: t.note || '',
          date: t.date,
        })),
        budgets: rawBudgets.map(b => ({
          category: b.category,
          amount: b.amount,
          month: b.month,
        })),
      }
      triggerDownload(JSON.stringify(sanitizedExport, null, 2), `finflow-backup-${formatDateForFilename()}.json`, 'application/json')
      setJsonExportSuccess(true)
      setTimeout(() => setJsonExportSuccess(false), 2000)
    } catch {
      toast.error('Export failed, try again.')
    } finally {
      setIsExportingJson(false)
    }
  }

  // ── File parsing ─────────────────────────────────────────────────────────────

  async function parseAndPreviewFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 5MB.')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'json') {
      toast.error('Only .json and .csv files are supported.')
      return
    }

    try {
      const text = await file.text()
      let sanitized: SanitizedImport

      if (ext === 'json') {
        sanitized = sanitizeImportedJSON(text)
      } else {
        sanitized = sanitizeImportedCSV(text)
      }

      const txns: Transaction[] = sanitized.transactions.map(t => ({
        id: '',
        user_id: user?.userId ?? '',
        amount: t.amount,
        type: t.type,
        category: t.category,
        note: t.note,
        date: t.date,
        created_at: new Date().toISOString(),
      }))

      const bgts: Budget[] = sanitized.budgets.map(b => ({
        id: '',
        user_id: user?.userId ?? '',
        category: b.category,
        amount: b.amount,
        month: b.month,
        created_at: new Date().toISOString(),
      }))

      if (txns.length === 0 && bgts.length === 0) {
        toast.error('No valid data found in file.')
        return
      }

      const dates = txns.map(t => t.date).filter(Boolean).sort()
      const dateRange = dates.length > 0
        ? { earliest: dates[0], latest: dates[dates.length - 1] }
        : null

      const uniqueCategories = new Set(txns.map(t => t.category)).size

      setParsedData({ transactions: txns, budgets: bgts })
      setImportPreview({
        fileName: file.name,
        fileSize: file.size,
        fileType: ext as 'csv' | 'json',
        transactionCount: txns.length,
        budgetCount: bgts.length,
        categoryCount: uniqueCategories,
        dateRange,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid file. Please use a FinFlow export.')
      setImportPreview(null)
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
              disabled={isExportingCsv || csvExportSuccess}
              className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-2xl hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isExportingCsv ? (
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              ) : csvExportSuccess ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <FileSpreadsheet className="w-8 h-8 text-teal-500" />
              )}
              <span className="text-sm font-semibold text-gray-700">
                {isExportingCsv ? 'Exporting...' : csvExportSuccess ? 'Downloaded!' : 'Export CSV'}
              </span>
              <span className="text-xs text-gray-400 text-center">Transactions &amp; budgets as spreadsheet</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={handleExportJson}
              disabled={isExportingJson || jsonExportSuccess}
              className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-2xl hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isExportingJson ? (
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              ) : jsonExportSuccess ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <FileJson className="w-8 h-8 text-teal-500" />
              )}
              <span className="text-sm font-semibold text-gray-700">
                {isExportingJson ? 'Exporting...' : jsonExportSuccess ? 'Downloaded!' : 'Export JSON'}
              </span>
              <span className="text-xs text-gray-400 text-center">Transactions &amp; budgets as JSON file</span>
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
                    ? 'border-teal-500 bg-[#ECFDF5]'
                    : 'border-gray-200 hover:border-teal-400 hover:bg-[#ECFDF5]'
                }`}
              >
                <Upload className={`w-10 h-10 text-gray-300 mx-auto mb-3 transition-transform ${isDraggingOver ? 'scale-110 text-teal-400' : ''}`} />
                <p className="text-sm font-medium text-gray-600">Drop your backup file here</p>
                <p className="text-xs text-gray-400 mt-1">Supports .csv and .json files</p>
                <button
                  type="button"
                  className="mt-3 text-xs text-teal-600 font-medium border border-teal-300 rounded-full px-4 py-1.5 hover:bg-teal-50"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                >
                  Browse File
                </button>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">.json</span>
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">.csv</span>
                </div>
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
              <p className="text-xs text-gray-400 mt-0.5 truncate">{importPreview.fileName} · {formatFileSize(importPreview.fileSize)}</p>

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

              {/* Cancel link */}
              <button
                onClick={resetImport}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}
