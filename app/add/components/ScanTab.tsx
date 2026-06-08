'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ScanLine, Camera, Upload, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { getCategoriesByType } from '@/lib/categories'
import { validateTransactionDate } from '@/lib/validateTransactionDate'
import { TEAL, FONT, ParsedTransaction, getTodayIST, resolveCategory, RED } from '../constants'
import { useTransaction } from '../hooks/useTransaction'
import { PreviewCard } from './PreviewCard'
import { ManualForm } from './ManualTab'
import { aiParseReceipt } from '@/lib/api-client'

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
      {/* Progress bar */}
      <div style={{ width: '100%', height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', background: TEAL, borderRadius: 2 }}
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(((currentStep + 1) / SCAN_STEPS.length) * 100, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

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
      if (!ctx) { reject(new Error('Failed to get canvas context')); return }
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

export default function ScanTab() {
  const { saveTransaction, isSubmitting, currentUser } = useTransaction()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [scanStep, setScanStep] = useState(-1)
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null)
  const [parsedMultiple, setParsedMultiple] = useState<ParsedTransaction[]>([])
  const [showEditForm, setShowEditForm] = useState(false)

  // Edit form state
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getTodayIST())
  const [amountError, setAmountError] = useState('')
  const [categoryError, setCategoryError] = useState('')

  const availableCategories = getCategoriesByType(type)

  const fillForm = (p: ParsedTransaction) => {
    setAmount(String(p.amount || ''))
    setType(p.type || 'expense')
    setCategory(resolveCategory(p.category))
    setNote(p.note || p.description || '')
    setDate(validateTransactionDate(p.date))
    setAmountError('')
    setCategoryError('')
  }

  const handleFileUpload = async (file: File) => {
    setLoading(true)
    setScanStep(0)
    setScanPreviewUrl(null)

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
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

      setScanStep(1)
      await new Promise(r => setTimeout(r, 100))
      setScanStep(2)

      const result = await aiParseReceipt(base64, mimeType)

      setScanStep(3)
      await new Promise(r => setTimeout(r, 300))

      const txs: ParsedTransaction[] = result.transactions || [result]
      // Apply date validation to all parsed transactions
      txs.forEach(tx => { tx.date = validateTransactionDate(tx.date) })

      if (txs.length === 1) {
        fillForm(txs[0])
        setParsed(txs[0])
      } else {
        setParsedMultiple(txs)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to scan receipt')
    } finally {
      setLoading(false)
      setScanStep(-1)
    }
  }

  const handleConfirm = () => {
    if (!parsed) return
    saveTransaction([{
      user_id: currentUser?.userId,
      amount: Number(parsed.amount) || 0,
      type: parsed.type || 'expense',
      category: resolveCategory(parsed.category),
      note: parsed.note || parsed.description || '',
      date: validateTransactionDate(parsed.date),
    }])
  }

  const handleConfirmEdit = () => {
    let valid = true
    setAmountError('')
    setCategoryError('')
    const parsedAmt = parseFloat(amount)
    if (!amount || isNaN(parsedAmt) || parsedAmt <= 0) {
      setAmountError('Please enter an amount')
      valid = false
    }
    if (!category) {
      setCategoryError('Please select a category')
      valid = false
    }
    if (!valid) return
    saveTransaction([{
      user_id: currentUser?.userId,
      amount: parsedAmt,
      type,
      category,
      note,
      date: validateTransactionDate(date),
    }])
  }

  const handleConfirmAll = () => {
    const txs = parsedMultiple.map(p => ({
      user_id: currentUser?.userId,
      amount: Number(p.amount) || 0,
      type: (p.type || 'expense') as 'income' | 'expense',
      category: resolveCategory(p.category),
      note: p.note || p.description || '',
      date: validateTransactionDate(p.date),
    }))
    saveTransaction(txs)
  }

  const discard = () => {
    setParsed(null)
    setParsedMultiple([])
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

  /* ── Single transaction preview ── */
  if (parsed && !showEditForm) {
    return (
      <PreviewCard
        parsed={parsed}
        onEdit={() => { fillForm(parsed); setShowEditForm(true) }}
        onConfirm={handleConfirm}
        onDiscard={discard}
        isSubmitting={isSubmitting}
      />
    )
  }

  /* ── Edit form ── */
  if (parsed && showEditForm) {
    return (
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
        onSave={handleConfirmEdit}
        onDiscard={discard}
        confirmMode
      />
    )
  }

  /* ── Multiple transactions ── */
  if (parsedMultiple.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
        <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>
          {parsedMultiple.length} transactions found
        </p>
        {parsedMultiple.map((p, i) => (
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
          onClick={handleConfirmAll}
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
          {isSubmitting ? 'Saving...' : `Save All (${parsedMultiple.length})`}
        </button>
        <button
          onClick={discard}
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
    )
  }

  /* ── Scan idle / loading ── */
  return (
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

      {loading && !scanPreviewUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: TEAL }}>
          <Loader2 size={18} className="animate-spin" />
          <span>Scanning...</span>
        </div>
      )}
    </div>
  )
}
