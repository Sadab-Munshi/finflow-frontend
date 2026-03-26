'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  PenLine, Sparkles, Mic, ScanLine,
  Loader2, Camera, Upload, Check, AlertTriangle, Calendar, Tag, FileText, Pencil,
  UtensilsCrossed, Car, ShoppingBag, Zap, Film, Heart,
  GraduationCap, Home, Apple, Scissors, Wallet, Laptop,
  Briefcase, TrendingUp, Gift, MoreHorizontal
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import Image from 'next/image'
import { addTransaction } from '@/lib/db'
import { categories, getCategoriesByType } from '@/lib/categories'
import { posthog } from '@/lib/posthog'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Transaction, Category } from '@/lib/types'
import { useUser } from '@/context/UserContext'

/* ─── Constants ─── */
const TEAL = '#00b894'
const RED  = '#ef4444'
const GRAY = '#9ca3af'
const FONT = '"DM Sans", "Inter", system-ui, sans-serif'

const categoryIconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  'Food & Dining': UtensilsCrossed,
  'Transport': Car,
  'Shopping': ShoppingBag,
  'Bills & Utilities': Zap,
  'Entertainment': Film,
  'Health': Heart,
  'Education': GraduationCap,
  'Rent': Home,
  'Groceries': Apple,
  'Personal Care': Scissors,
  'Salary': Wallet,
  'Freelance': Laptop,
  'Business': Briefcase,
  'Investment': TrendingUp,
  'Gift': Gift,
  'Other': MoreHorizontal,
}

const tabsConfig = [
  { id: 'manual', label: 'Manual', Icon: PenLine },
  { id: 'nlp',    label: 'NLP',    Icon: Sparkles },
  { id: 'voice',  label: 'Voice',  Icon: Mic },
  { id: 'scan',   label: 'Scan',   Icon: ScanLine },
]

/* ─── Types ─── */
interface ParsedTransaction {
  amount: number
  type: 'income' | 'expense'
  category: string
  note: string
  description?: string
  date: string | null
  confidence: number
}

/* ─── Helpers ─── */
function getTodayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function formatDateDisplay(dateStr: string): string {
  const today = getTodayIST()
  const [y, m, d] = dateStr.split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const formatted = `${d} ${months[m - 1]} ${y}`
  return dateStr === today ? `Today, ${formatted}` : formatted
}

/* ─── Waveform Animation ─── */
const WAVEFORM_BARS = Array.from({ length: 20 }).map((_, i) => ({
  maxHeight: 20 + ((i * 7 + 3) % 20),
  duration: 0.4 + ((i * 13 + 5) % 10) / 25,
}))

function WaveformBars() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40, marginTop: 16 }}>
      {WAVEFORM_BARS.map((bar, i) => (
        <motion.div
          key={i}
          style={{ width: 3, borderRadius: 2, backgroundColor: TEAL }}
          animate={{ height: [8, bar.maxHeight, 8] }}
          transition={{ duration: bar.duration, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
        />
      ))}
    </div>
  )
}

/* ─── Image Compression ─── */
function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<{ base64: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let w = img.width
      let h = img.height
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w)
        w = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, w, h)
      const previewUrl = canvas.toDataURL('image/jpeg', quality)
      const base64 = previewUrl.split(',')[1]
      URL.revokeObjectURL(url)
      resolve({ base64, previewUrl })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

/* ─── Scan Progress Steps ─── */
const SCAN_STEPS = [
  { label: 'Reading image...' },
  { label: 'Extracting text...' },
  { label: 'Parsing details...' },
  { label: 'Done!' },
]

function ScanProgress({ currentStep }: { currentStep: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0', fontFamily: FONT }}>
      {/* Animated progress bar */}
      <div style={{ width: '100%', height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', background: TEAL, borderRadius: 2 }}
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(((currentStep + 1) / SCAN_STEPS.length) * 100, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Animated scan icon */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ScanLine size={40} color={TEAL} />
      </motion.div>

      <motion.p
        key={currentStep}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ color: TEAL, fontWeight: 600, fontSize: 16 }}
      >
        {currentStep < SCAN_STEPS.length ? SCAN_STEPS[currentStep].label : 'Done!'}
      </motion.p>

      {/* Step list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 4 }}>
        {SCAN_STEPS.map((step, i) => {
          const done = i < currentStep || (i === SCAN_STEPS.length - 1 && currentStep >= SCAN_STEPS.length - 1)
          const active = i === currentStep && currentStep < SCAN_STEPS.length - 1
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: done ? TEAL : active ? `${TEAL}20` : '#f3f4f6',
                border: active ? `2px solid ${TEAL}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s',
              }}>
                {done ? <Check size={14} color="#fff" /> : active ? (
                  <motion.div
                    style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                ) : null}
              </div>
              <span style={{
                fontSize: 14, fontWeight: done || active ? 600 : 400,
                color: done ? TEAL : active ? '#374151' : '#9ca3af',
                transition: 'all 0.3s',
              }}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Preview Card ─── */
interface PreviewCardProps {
  parsed: ParsedTransaction
  onEdit: () => void
  onConfirm: () => void
  onDiscard: () => void
  isSubmitting: boolean
}

function PreviewCard({ parsed, onEdit, onConfirm, onDiscard, isSubmitting }: PreviewCardProps) {
  const confidence = parsed.confidence ?? 90
  const confidenceColor = confidence >= 90 ? TEAL : confidence >= 70 ? '#f97316' : RED
  const filledBars = Math.round((confidence / 100) * 10)
  const Icon = categoryIconMap[parsed.category] || categoryIconMap[resolveStaticCategory(parsed.category)] || MoreHorizontal
  const displayCategory = resolveStaticCategory(parsed.category)
  const displayDate = parsed.date ? formatDateDisplay(parsed.date) : formatDateDisplay(getTodayIST())

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      style={{
        background: '#fff', borderRadius: 20, padding: 24,
        border: `1.5px solid ${TEAL}30`,
        boxShadow: `0 0 24px ${TEAL}18, 0 4px 24px rgba(0,0,0,0.06)`,
        fontFamily: FONT,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Sparkles size={18} color={TEAL} />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>AI understood this as:</span>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{
          fontSize: 42, fontWeight: 700,
          color: parsed.type === 'expense' ? RED : TEAL,
          lineHeight: 1,
        }}>
          ₹{Number(parsed.amount).toLocaleString('en-IN')}
        </span>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {/* Category + Type */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={16} color="#6b7280" />
            <Icon size={16} />
            <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{displayCategory}</span>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
            background: parsed.type === 'expense' ? `${RED}15` : `${TEAL}15`,
            color: parsed.type === 'expense' ? RED : TEAL,
            textTransform: 'capitalize',
          }}>
            {parsed.type}
          </span>
        </div>

        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} color="#6b7280" />
          <span style={{ fontSize: 14, color: '#374151' }}>{displayDate}</span>
        </div>

        {/* Description */}
        {(parsed.note || parsed.description) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="#6b7280" />
            <span style={{ fontSize: 14, color: '#374151' }}>{parsed.note || parsed.description}</span>
          </div>
        )}
      </div>

      {/* Confidence Bar */}
      <div style={{
        padding: '14px 16px', background: '#f9fafb', borderRadius: 12,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>AI Confidence</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: confidenceColor }}>{confidence}%</span>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 6, borderRadius: 3,
                background: i < filledBars ? confidenceColor : '#e5e7eb',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
        {confidence < 70 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <AlertTriangle size={14} color={RED} />
            <span style={{ fontSize: 12, color: RED, fontWeight: 500 }}>Please verify details</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onEdit}
          style={{
            flex: 1, padding: '14px 0',
            background: '#fff', border: `1.5px solid #e5e7eb`, borderRadius: 14,
            fontSize: 15, fontWeight: 600, color: '#374151',
            cursor: 'pointer', fontFamily: FONT,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Pencil size={16} /> Edit
        </button>
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          style={{
            flex: 2, padding: '14px 0',
            background: isSubmitting ? '#d1d5db' : TEAL,
            border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 600, color: '#fff',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontFamily: FONT,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Check size={16} /> Confirm Save
        </button>
      </div>

      {/* Discard */}
      <button
        onClick={onDiscard}
        style={{
          width: '100%', padding: '10px', marginTop: 8,
          background: 'transparent', color: '#9ca3af', border: 'none',
          fontSize: 13, cursor: 'pointer', fontFamily: FONT,
        }}
      >
        Discard
      </button>
    </motion.div>
  )
}

/* static resolver (outside component) */
function resolveStaticCategory(aiCategory: string): string {
  if (!aiCategory) return 'Other'
  const available = categories.map(c => c.name)
  const match = available.find(c => c.toLowerCase() === aiCategory.toLowerCase().trim())
  if (match) return match
  const mappings: Record<string, string> = {
    'health & medical': 'Health', 'housing & rent': 'Rent',
    'business income': 'Business', 'groceries & essentials': 'Groceries',
  }
  return mappings[aiCategory.toLowerCase().trim()] || 'Other'
}

/* ─── Manual Form (shared by Manual, NLP confirm, Voice confirm, Scan confirm) ─── */
interface ManualFormProps {
  amount: string
  setAmount: (v: string) => void
  type: 'income' | 'expense'
  setType: (v: 'income' | 'expense') => void
  category: string
  setCategory: (v: string) => void
  note: string
  setNote: (v: string) => void
  date: string
  setDate: (v: string) => void
  amountError: string
  setAmountError: (v: string) => void
  categoryError: string
  setCategoryError: (v: string) => void
  availableCategories: Category[]
  isSubmitting: boolean
  onSave: () => void
  onDiscard?: () => void
  confirmMode?: boolean
}

function ManualForm({
  amount, setAmount, type, setType, category, setCategory,
  note, setNote, date, setDate, amountError, setAmountError,
  categoryError, setCategoryError, availableCategories,
  isSubmitting, onSave, onDiscard, confirmMode,
}: ManualFormProps) {
  const dateInputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: FONT }}>
      {/* Amount */}
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{
            fontSize: 48, fontWeight: 700,
            color: type === 'expense' ? RED : TEAL,
            lineHeight: 1,
          }}>
            ₹
          </span>
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, '')
              setAmount(val)
              if (val) setAmountError('')
            }}
            style={{
              fontSize: 48, fontWeight: 700,
              color: type === 'expense' ? RED : TEAL,
              background: 'transparent', border: 'none', outline: 'none',
              textAlign: 'center', width: '65%',
              fontFamily: FONT, lineHeight: 1,
            }}
          />
        </div>
        {amountError && (
          <p style={{ color: RED, fontSize: 13, marginTop: 6 }}>{amountError}</p>
        )}
      </div>

      {/* Type Toggle */}
      <div style={{
        display: 'flex', background: '#f3f4f6', borderRadius: 12, padding: 4,
        position: 'relative', overflow: 'hidden',
      }}>
        <motion.div
          layout
          style={{
            position: 'absolute', top: 4,
            left: type === 'expense' ? 4 : '50%',
            width: 'calc(50% - 4px)', height: 'calc(100% - 8px)',
            background: type === 'expense' ? RED : TEAL,
            borderRadius: 10,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              if (t !== type) { setType(t); setCategory('') }
            }}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none',
              color: type === t ? '#fff' : '#6b7280',
              fontWeight: 600, fontSize: 15, cursor: 'pointer',
              position: 'relative', zIndex: 1, fontFamily: FONT,
              transition: 'color 0.2s', textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Category Chips */}
      <div>
        <div
          style={{
            display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 4,
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
            scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
          }}
          className="[&::-webkit-scrollbar]:hidden"
        >
          {availableCategories.map(cat => {
            const Icon = categoryIconMap[cat.name] || MoreHorizontal
            const selected = category === cat.name
            return (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.name); setCategoryError('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 20,
                  border: selected ? `1.5px solid ${TEAL}` : '1.5px solid #e5e7eb',
                  background: selected ? TEAL : '#fff',
                  color: selected ? '#fff' : '#6b7280',
                  fontSize: 13, fontWeight: selected ? 600 : 400,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all 0.2s', fontFamily: FONT,
                }}
              >
                <Icon size={16} />
                {cat.name}
              </button>
            )
          })}
        </div>
        {categoryError && (
          <p style={{ color: RED, fontSize: 13, marginTop: 8 }}>{categoryError}</p>
        )}
      </div>

      {/* Description (optional) */}
      <input
        placeholder="What was this for? (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{
          width: '100%', padding: '14px 16px',
          border: '1.5px solid #e5e7eb', borderRadius: 12,
          fontSize: 15, outline: 'none', fontFamily: FONT,
          transition: 'border-color 0.2s', boxSizing: 'border-box',
        }}
        onFocus={(e) => { e.target.style.borderColor = TEAL }}
        onBlur={(e) => { e.target.style.borderColor = '#e5e7eb' }}
      />

      {/* Date */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => dateInputRef.current?.showPicker?.()}
          style={{
            width: '100%', padding: '14px 16px',
            border: '1.5px solid #e5e7eb', borderRadius: 12,
            fontSize: 15, background: '#fff', color: '#374151',
            cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
          }}
        >
          {formatDateDisplay(date)}
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%', opacity: 0, cursor: 'pointer',
          }}
        />
      </div>

      {/* Save Button */}
      <button
        onClick={onSave}
        disabled={isSubmitting}
        style={{
          width: '100%', padding: '16px',
          background: isSubmitting ? '#d1d5db' : TEAL,
          color: '#fff', border: 'none', borderRadius: 14,
          fontSize: 16, fontWeight: 600,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          fontFamily: FONT, transition: 'background 0.2s',
        }}
      >
        {isSubmitting ? 'Saving...' : 'Save Transaction'}
      </button>

      {/* Discard (confirm mode only) */}
      {confirmMode && onDiscard && (
        <button
          onClick={onDiscard}
          style={{
            width: '100%', padding: '12px',
            background: 'transparent', color: '#6b7280',
            border: '1.5px solid #e5e7eb', borderRadius: 14,
            fontSize: 14, cursor: 'pointer', fontFamily: FONT,
          }}
        >
          Discard
        </button>
      )}
    </div>
  )
}

/* ─── Main Component ─── */
function AddTransactionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: currentUser } = useUser()

  /* State */
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab') || 'manual'
    // Backward compat: old URLs used ?tab=text for NLP
    return tab === 'text' ? 'nlp' : tab
  })
  const [loading, setLoading] = useState(false)
  const [parsedTransaction, setParsedTransaction] = useState<ParsedTransaction | null>(null)
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])

  // Form
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getTodayIST())
  const [amountError, setAmountError] = useState('')
  const [categoryError, setCategoryError] = useState('')

  // NLP
  const [textInput, setTextInput] = useState('')

  // Voice
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingDurationRef = useRef(0)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const MAX_RECORDING_SECONDS = 15

  // Scan
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [scanStep, setScanStep] = useState(-1)
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null)

  // Preview card
  const [showEditForm, setShowEditForm] = useState(false)

  /* Effects */
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isListening && transcript) {
      posthog.capture('voice_used', { transcript_length: transcript.length })
    }
  }, [isListening, transcript])

  useEffect(() => {
    if (isListening) {
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          recordingDurationRef.current = newTime
          if (newTime >= MAX_RECORDING_SECONDS) {
            handleVoiceStop()
            clearInterval(timer)
            return MAX_RECORDING_SECONDS
          }
          return newTime
        })
      }, 1000)
      return () => clearInterval(timer)
    } else {
      setRecordingTime(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening])

  if (!mounted) return null

  /* ─── API Logic (preserved from original) ─── */

  const callAI = async (endpoint: string, body: object) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || `AI request failed (${res.status})`)
    }
    return res.json()
  }

  const resolveCategory = (aiCategory: string): string => {
    if (!aiCategory) return 'Other'
    const available = categories.map(c => c.name)
    const match = available.find(c => c.toLowerCase() === aiCategory.toLowerCase().trim())
    if (match) return match
    const mappings: Record<string, string> = {
      'health & medical': 'Health',
      'housing & rent': 'Rent',
      'business income': 'Business',
      'groceries & essentials': 'Groceries',
    }
    return mappings[aiCategory.toLowerCase().trim()] || 'Other'
  }

  const checkBudgetAlert = async () => {
    try {
      await fetch('/api/notifications/budget-alert', { method: 'POST' })
    } catch (e) {
      console.error('[checkBudgetAlert] Failed:', e)
    }
  }

  /* ─── Fire and Forget Save ─── */
  const fireAndForgetSave = (transactions: Array<Omit<Transaction, 'id' | 'created_at'>>) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    const toastId = toast.loading('Saving...')
    router.push('/history')

    void (async () => {
      try {
        for (const tx of transactions) {
          const result = await addTransaction(tx)
          if (!result) throw new Error('Save failed')
          posthog.capture('transaction_added', {
            type: tx.type, category: tx.category, amount: tx.amount,
          })
        }
        toast.success('Saved ✅', { id: toastId })
        try { await checkBudgetAlert() } catch (e) { console.error('[checkBudgetAlert]', e) }
      } catch {
        toast.error('Failed, retry?', { id: toastId, duration: 5000 })
      }
    })()
  }

  /* ─── Validation ─── */
  const validateForm = (): boolean => {
    let valid = true
    setAmountError('')
    setCategoryError('')

    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setAmountError('Please enter an amount')
      valid = false
    }
    if (!category) {
      setCategoryError('Please select a category')
      valid = false
    }
    return valid
  }

  /* ─── Save Handlers ─── */
  const handleManualSave = () => {
    if (!validateForm()) return
    fireAndForgetSave([{ user_id: currentUser?.userId, amount: parseFloat(amount), type, category, note, date }])
  }

  const handleConfirmSave = () => {
    if (!validateForm()) return
    fireAndForgetSave([{
      user_id: currentUser?.userId,
      amount: parseFloat(amount), type, category, note,
      date: getTodayIST(),
    }])
  }

  const handleConfirmAllSave = () => {
    const txs = parsedTransactions.map(p => ({
      user_id: currentUser?.userId,
      amount: Number(p.amount) || 0,
      type: (p.type || 'expense') as 'income' | 'expense',
      category: resolveCategory(p.category),
      note: p.note || p.description || '',
      date: getTodayIST(),
    }))
    fireAndForgetSave(txs)
  }

  /* ─── Fill Form From Parsed ─── */
  const fillFormFromParsed = (parsed: ParsedTransaction) => {
    setAmount(String(parsed.amount || ''))
    setType(parsed.type || 'expense')
    setCategory(resolveCategory(parsed.category))
    setNote(parsed.note || parsed.description || '')
    setDate(getTodayIST())
    setAmountError('')
    setCategoryError('')
  }

  const handlePreviewConfirm = () => {
    if (!parsedTransaction) return
    fireAndForgetSave([{
      user_id: currentUser?.userId,
      amount: Number(parsedTransaction.amount) || 0,
      type: parsedTransaction.type || 'expense',
      category: resolveCategory(parsedTransaction.category),
      note: parsedTransaction.note || parsedTransaction.description || '',
      date: parsedTransaction.date || getTodayIST(),
    }])
  }

  const handleEditFromPreview = () => {
    if (parsedTransaction) fillFormFromParsed(parsedTransaction)
    setShowEditForm(true)
  }

  const discardParsed = () => {
    setParsedTransaction(null)
    setParsedTransactions([])
    setShowEditForm(false)
    setScanPreviewUrl(null)
    setAmount('')
    setCategory('')
    setNote('')
    setType('expense')
    setDate(getTodayIST())
    setAmountError('')
    setCategoryError('')
  }

  /* ─── NLP Handler ─── */
  const handleParseText = async () => {
    if (!textInput.trim()) return
    setLoading(true)
    try {
      const result = await callAI('/api/ai/parse-text', { text: textInput })
      fillFormFromParsed(result)
      setParsedTransaction(result)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse. Please try again.')
    } finally { setLoading(false) }
  }

  /* ─── Voice Handlers ─── */
  const handleVoiceStart = async () => {
    setTranscript('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        setLoading(true)
        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')
          const sarvamRes = await fetch('/api/ai/speech-to-text', { method: 'POST', body: formData })
          if (!sarvamRes.ok) {
            const errorData = await sarvamRes.json().catch(() => ({}))
            throw new Error(errorData.error || `Speech-to-text failed (${sarvamRes.status})`)
          }
          const { transcript } = await sarvamRes.json()
          setTranscript(transcript)

          const mistralRes = await fetch('/api/ai/parse-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: transcript }),
          })
          if (!mistralRes.ok) {
            const errorData = await mistralRes.json().catch(() => ({}))
            throw new Error(errorData.error || `Parse failed (${mistralRes.status})`)
          }
          const parsed = await mistralRes.json()
          fillFormFromParsed(parsed)
          setParsedTransaction(parsed)
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'Voice processing failed')
        } finally { setLoading(false) }
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsListening(true)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  const handleVoiceStop = () => {
    mediaRecorder?.stop()
    setIsListening(false)
  }

  /* ─── Scan Handler ─── */
  const handleFileUpload = async (file: File) => {
    setLoading(true)
    setScanStep(0) // Reading image...
    setScanPreviewUrl(null)

    try {
      // Step 0→1: Compress image
      const isPdf = file.type === 'application/pdf'
      let base64: string
      let mimeType = file.type || 'image/jpeg'

      if (!isPdf) {
        const compressed = await compressImage(file, 1200, 0.8)
        base64 = compressed.base64
        mimeType = 'image/jpeg'
        setScanPreviewUrl(compressed.previewUrl)
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        base64 = dataUrl.split(',')[1]
      }

      setScanStep(1) // Extracting text...

      // Simulate brief pause so step 1 is visible
      await new Promise(r => setTimeout(r, 300))
      setScanStep(2) // Parsing details...

      const result = await callAI('/api/ai/parse-receipt', { base64, mimeType })

      setScanStep(3) // Done!
      await new Promise(r => setTimeout(r, 500))

      const txs: ParsedTransaction[] = result.transactions || [result]
      if (txs.length === 1) {
        fillFormFromParsed(txs[0])
        setParsedTransaction(txs[0])
      } else {
        setParsedTransactions(txs)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to scan receipt')
    } finally {
      setLoading(false)
      setScanStep(-1)
    }
  }

  /* ─── Derived ─── */
  const availableCategories = getCategoriesByType(type)

  /* ─── Render ─── */
  return (
    <Layout>
      <div style={{ background: '#ffffff', minHeight: '100dvh', fontFamily: FONT }}>
        <div style={{ padding: '16px 16px 100px' }}>

          {/* ─── Tab Bar ─── */}
          <div style={{
            display: 'flex', position: 'relative',
            borderBottom: '2px solid #f3f4f6', marginBottom: 24,
          }}>
            {tabsConfig.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6,
                    padding: '12px 0', background: 'none', border: 'none',
                    color: isActive ? TEAL : GRAY,
                    fontWeight: isActive ? 700 : 400,
                    fontSize: 14, cursor: 'pointer', fontFamily: FONT,
                    position: 'relative', paddingBottom: 14,
                  }}
                >
                  <tab.Icon size={18} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      style={{
                        position: 'absolute', bottom: -2, left: 0, right: 0,
                        height: 3, background: TEAL, borderRadius: 2,
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* ─── Tab Content ─── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (parsedTransaction ? (showEditForm ? '-edit' : '-confirm') : '')}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >

              {/* ═══ MANUAL TAB ═══ */}
              {activeTab === 'manual' && (
                <ManualForm
                  amount={amount} setAmount={setAmount}
                  type={type} setType={setType}
                  category={category} setCategory={setCategory}
                  note={note} setNote={setNote}
                  date={date} setDate={setDate}
                  amountError={amountError} setAmountError={setAmountError}
                  categoryError={categoryError} setCategoryError={setCategoryError}
                  availableCategories={availableCategories}
                  isSubmitting={isSubmitting}
                  onSave={handleManualSave}
                />
              )}

              {/* ═══ NLP TAB ═══ */}
              {activeTab === 'nlp' && (
                parsedTransaction && !showEditForm ? (
                  <PreviewCard
                    parsed={parsedTransaction}
                    onEdit={handleEditFromPreview}
                    onConfirm={handlePreviewConfirm}
                    onDiscard={discardParsed}
                    isSubmitting={isSubmitting}
                  />
                ) : parsedTransaction && showEditForm ? (
                  <ManualForm
                    amount={amount} setAmount={setAmount}
                    type={type} setType={setType}
                    category={category} setCategory={setCategory}
                    note={note} setNote={setNote}
                    date={date} setDate={setDate}
                    amountError={amountError} setAmountError={setAmountError}
                    categoryError={categoryError} setCategoryError={setCategoryError}
                    availableCategories={availableCategories}
                    isSubmitting={isSubmitting}
                    onSave={handleConfirmSave}
                    onDiscard={discardParsed}
                    confirmMode
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        rows={4}
                        placeholder="e.g. spent 500 on food today"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        style={{
                          width: '100%', padding: '16px 48px 16px 16px',
                          border: '1.5px solid #e5e7eb', borderRadius: 14,
                          fontSize: 16, resize: 'none', outline: 'none',
                          fontFamily: FONT, transition: 'border-color 0.2s',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = TEAL }}
                        onBlur={(e) => { e.target.style.borderColor = '#e5e7eb' }}
                      />
                      <Sparkles
                        size={20}
                        style={{ position: 'absolute', top: 16, right: 16, color: TEAL, opacity: 0.5 }}
                      />
                    </div>
                    <button
                      onClick={handleParseText}
                      disabled={loading || !textInput.trim()}
                      style={{
                        width: '100%', padding: '14px',
                        background: (loading || !textInput.trim()) ? '#d1d5db' : TEAL,
                        color: '#fff', border: 'none', borderRadius: 14,
                        fontSize: 16, fontWeight: 600,
                        cursor: (loading || !textInput.trim()) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        fontFamily: FONT,
                      }}
                    >
                      {loading
                        ? <><Loader2 size={18} className="animate-spin" /> Parsing...</>
                        : <><Sparkles size={18} /> Parse with AI</>
                      }
                    </button>
                  </div>
                )
              )}

              {/* ═══ VOICE TAB ═══ */}
              {activeTab === 'voice' && (
                parsedTransaction && !showEditForm ? (
                  <PreviewCard
                    parsed={parsedTransaction}
                    onEdit={handleEditFromPreview}
                    onConfirm={handlePreviewConfirm}
                    onDiscard={discardParsed}
                    isSubmitting={isSubmitting}
                  />
                ) : parsedTransaction && showEditForm ? (
                  <ManualForm
                    amount={amount} setAmount={setAmount}
                    type={type} setType={setType}
                    category={category} setCategory={setCategory}
                    note={note} setNote={setNote}
                    date={date} setDate={setDate}
                    amountError={amountError} setAmountError={setAmountError}
                    categoryError={categoryError} setCategoryError={setCategoryError}
                    availableCategories={availableCategories}
                    isSubmitting={isSubmitting}
                    onSave={handleConfirmSave}
                    onDiscard={discardParsed}
                    confirmMode
                  />
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 16, paddingTop: 32, fontFamily: FONT,
                  }}>
                    <motion.button
                      onClick={isListening ? handleVoiceStop : handleVoiceStart}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        width: 96, height: 96, borderRadius: '50%',
                        background: isListening ? RED : TEAL,
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isListening ? `0 0 0 8px ${RED}30` : `0 0 0 8px ${TEAL}30`,
                        transition: 'all 0.3s',
                      }}
                    >
                      <Mic size={40} color="#fff" />
                    </motion.button>

                    <p style={{ color: isListening ? RED : '#6b7280', fontSize: 16, fontWeight: 500 }}>
                      {isListening ? 'Listening... Tap to stop' : 'Tap to speak'}
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: 12 }}>
                      Supports Hindi, Bengali, Tamil, Telugu & more
                    </p>

                    {isListening && (
                      <>
                        <WaveformBars />
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: 14, color: RED, fontWeight: 500 }}>
                            {recordingTime}s / {MAX_RECORDING_SECONDS}s
                          </p>
                          <div style={{
                            width: 200, height: 4, background: '#e5e7eb',
                            borderRadius: 2, marginTop: 4,
                          }}>
                            <div style={{
                              width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%`,
                              height: '100%', background: RED,
                              borderRadius: 2, transition: 'width 0.3s',
                            }} />
                          </div>
                        </div>
                      </>
                    )}

                    {loading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: TEAL }}>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Processing...</span>
                      </div>
                    )}

                    {transcript && !loading && !parsedTransaction && (
                      <div style={{
                        width: '100%', padding: 16, background: '#f0fdf4',
                        borderRadius: 12, marginTop: 8,
                      }}>
                        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Transcript:</p>
                        <p style={{ fontWeight: 500 }}>{transcript}</p>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* ═══ SCAN TAB ═══ */}
              {activeTab === 'scan' && (
                parsedTransaction && !showEditForm ? (
                  <PreviewCard
                    parsed={parsedTransaction}
                    onEdit={handleEditFromPreview}
                    onConfirm={handlePreviewConfirm}
                    onDiscard={discardParsed}
                    isSubmitting={isSubmitting}
                  />
                ) : parsedTransaction && showEditForm ? (
                  <ManualForm
                    amount={amount} setAmount={setAmount}
                    type={type} setType={setType}
                    category={category} setCategory={setCategory}
                    note={note} setNote={setNote}
                    date={date} setDate={setDate}
                    amountError={amountError} setAmountError={setAmountError}
                    categoryError={categoryError} setCategoryError={setCategoryError}
                    availableCategories={availableCategories}
                    isSubmitting={isSubmitting}
                    onSave={handleConfirmSave}
                    onDiscard={discardParsed}
                    confirmMode
                  />
                ) : parsedTransactions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
                    <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>
                      {parsedTransactions.length} transactions found
                    </p>
                    {parsedTransactions.map((p, i) => (
                      <div key={i} style={{
                        padding: 16, border: '1.5px solid #e5e7eb', borderRadius: 12,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <p style={{ fontWeight: 500 }}>{p.note || p.description}</p>
                          <p style={{ fontSize: 12, color: '#9ca3af' }}>{resolveCategory(p.category)}</p>
                        </div>
                        <p style={{ fontWeight: 600, color: p.type === 'income' ? TEAL : RED }}>
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </p>
                      </div>
                    ))}
                    <button
                      onClick={handleConfirmAllSave}
                      disabled={isSubmitting}
                      style={{
                        width: '100%', padding: 14,
                        background: isSubmitting ? '#d1d5db' : TEAL,
                        color: '#fff', border: 'none', borderRadius: 14,
                        fontSize: 16, fontWeight: 600,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        fontFamily: FONT,
                      }}
                    >
                      {isSubmitting ? 'Saving...' : `Save All (${parsedTransactions.length})`}
                    </button>
                    <button
                      onClick={discardParsed}
                      style={{
                        width: '100%', padding: 12,
                        background: 'transparent', color: '#6b7280',
                        border: '1.5px solid #e5e7eb', borderRadius: 14,
                        fontSize: 14, cursor: 'pointer', fontFamily: FONT,
                      }}
                    >
                      Discard
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 24, paddingTop: 32, fontFamily: FONT,
                  }}>
                    {loading ? (
                      <div style={{ width: '100%' }}>
                        {scanPreviewUrl && (
                          <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden' }}>
                            <Image
                              src={scanPreviewUrl}
                              alt="Receipt preview"
                              width={400}
                              height={200}
                              unoptimized
                              style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, opacity: 0.6 }}
                            />
                          </div>
                        )}
                        <ScanProgress currentStep={scanStep} />
                      </div>
                    ) : (
                      <>
                        <div style={{
                          width: 96, height: 96, borderRadius: '50%',
                          background: `${TEAL}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <ScanLine size={40} color={TEAL} />
                        </div>

                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style={{ display: 'none' }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                        />
                        <input
                          ref={galleryInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.heic,.pdf"
                          style={{ display: 'none' }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                        />

                        <button
                          onClick={() => cameraInputRef.current?.click()}
                          style={{
                            width: '100%', padding: 14,
                            background: TEAL, color: '#fff',
                            border: 'none', borderRadius: 14,
                            fontSize: 16, fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            fontFamily: FONT,
                          }}
                        >
                          <Camera size={20} /> Open Camera
                        </button>

                        <button
                          onClick={() => galleryInputRef.current?.click()}
                          style={{
                            width: '100%', padding: 12,
                            background: 'transparent', color: '#6b7280',
                            border: '1.5px solid #e5e7eb', borderRadius: 14,
                            fontSize: 14, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            fontFamily: FONT,
                          }}
                        >
                          <Upload size={18} /> Upload from Gallery
                        </button>

                        <p style={{ fontSize: 12, color: '#9ca3af' }}>
                          JPG, PNG, PDF supported
                        </p>
                      </>
                    )}
                  </div>
                )
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  )
}

/* ─── Export ─── */
export default function AddPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AddTransactionContent />
    </Suspense>
  )
}
