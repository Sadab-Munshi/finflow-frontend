'use client'

import { useTranslations } from 'next-intl'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ScanLine,
  Camera,
  Upload,
  Check,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Receipt,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { BorderBeam } from 'border-beam'
import { getCategoriesByType } from '@/lib/categories'
import { validateTransactionDate } from '@/lib/validateTransactionDate'
import { TEAL, FONT, ParsedTransaction, getTodayIST, resolveCategory } from '../constants'
import { useTransaction } from '../hooks/useTransaction'
import { PreviewCard } from './PreviewCard'
import { ManualForm } from './ManualTab'
import { aiParseReceipt } from '@/lib/api-client'

/* ─── Scan Progress Steps ─── */
const SCAN_STEPS = [
  { label: 'readingImage' },
  { label: 'extractingText' },
  { label: 'parsingDetails' },
  { label: 'scanDone' },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function ScanProgress({ currentStep }: { currentStep: number }) {
  const t = useTranslations('add')
  const pct = Math.min(Math.round(((currentStep + 1) / SCAN_STEPS.length) * 100), 100)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '20px',
        background: '#ffffff',
        borderRadius: 20,
        border: '1.5px solid #e5e7eb',
        boxShadow: '0 10px 30px -10px rgba(0, 184, 148, 0.12)',
        fontFamily: FONT,
      }}
    >
      {/* Top status header + percentage */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <motion.p
          key={currentStep}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ color: '#0f172a', fontWeight: 700, fontSize: 15, margin: 0 }}
        >
          {currentStep < SCAN_STEPS.length
            ? t(SCAN_STEPS[currentStep].label as 'readingImage' | 'extractingText' | 'parsingDetails' | 'scanDone')
            : t('scanDone')}
        </motion.p>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: TEAL,
            background: `${TEAL}15`,
            padding: '3px 10px',
            borderRadius: 999,
          }}
        >
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${TEAL}, #10b981)`,
            borderRadius: 999,
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      </div>

      {/* Step Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 2 }}>
        {SCAN_STEPS.map((step, i) => {
          const done = i < currentStep || (i === SCAN_STEPS.length - 1 && currentStep >= SCAN_STEPS.length - 1)
          const active = i === currentStep && currentStep < SCAN_STEPS.length - 1
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: done ? TEAL : active ? `${TEAL}18` : '#f3f4f6',
                  border: active ? `2px solid ${TEAL}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s',
                  flexShrink: 0,
                }}
              >
                {done ? (
                  <Check size={13} color="#fff" />
                ) : active ? (
                  <motion.div
                    style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL }}
                    animate={{ scale: [1, 1.35, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                ) : (
                  <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{i + 1}</span>
                )}
              </div>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: done || active ? 600 : 400,
                  color: done ? TEAL : active ? '#1e293b' : '#9ca3af',
                  transition: 'all 0.3s',
                }}
              >
                {t(step.label as 'readingImage' | 'extractingText' | 'parsingDetails' | 'scanDone')}
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
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      const previewUrl = canvas.toDataURL('image/jpeg', quality)
      const base64 = previewUrl.split(',')[1]
      URL.revokeObjectURL(url)
      resolve({ base64, previewUrl })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}

export default function ScanTab() {
  const t = useTranslations('add')
  const { saveTransaction, isSubmitting, currentUser } = useTransaction()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [scanStep, setScanStep] = useState(-1)
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null)
  const [scannedFileMeta, setScannedFileMeta] = useState<{ name: string; size: string; isPdf: boolean } | null>(null)
  const [parsedList, setParsedList] = useState<ParsedTransaction[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

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
    setParsedList([])
    setEditingIndex(null)

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    setScannedFileMeta({
      name: file.name || (isPdf ? 'document.pdf' : 'receipt.jpg'),
      size: formatFileSize(file.size || 0),
      isPdf,
    })

    try {
      let base64: string
      let mimeType = file.type || 'image/jpeg'

      if (!isPdf) {
        const compressed = await compressImage(file, 1200, 0.8)
        base64 = compressed.base64
        mimeType = 'image/jpeg'
        setScanPreviewUrl(compressed.previewUrl)
      } else {
        mimeType = 'application/pdf'
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        base64 = dataUrl.split(',')[1]
      }

      setScanStep(1)
      await new Promise((r) => setTimeout(r, 120))
      setScanStep(2)

      const result = await aiParseReceipt(base64, mimeType)

      setScanStep(3)
      await new Promise((r) => setTimeout(r, 280))

      const txs: ParsedTransaction[] = result.transactions || [result]
      txs.forEach((tx) => {
        tx.date = validateTransactionDate(tx.date)
      })

      if (txs.length === 1) {
        fillForm(txs[0])
      }
      setParsedList(txs)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('scanFailure'))
    } finally {
      setLoading(false)
      setScanStep(-1)
    }
  }

  const handleConfirmSingle = (index: number) => {
    const p = parsedList[index]
    if (!p) return
    saveTransaction([
      {
        user_id: currentUser?.userId,
        amount: Number(p.amount) || 0,
        type: p.type || 'expense',
        category: resolveCategory(p.category),
        note: p.note || p.description || '',
        date: validateTransactionDate(p.date),
      },
    ])
    setParsedList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleEditStart = (index: number) => {
    fillForm(parsedList[index])
    setEditingIndex(index)
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
    saveTransaction([
      {
        user_id: currentUser?.userId,
        amount: parsedAmt,
        type,
        category,
        note,
        date: validateTransactionDate(date),
      },
    ])
    if (editingIndex !== null) {
      setParsedList((prev) => prev.filter((_, i) => i !== editingIndex))
      setEditingIndex(null)
    }
  }

  const handleConfirmAll = () => {
    const txs = parsedList.map((p) => ({
      user_id: currentUser?.userId,
      amount: Number(p.amount) || 0,
      type: (p.type || 'expense') as 'income' | 'expense',
      category: resolveCategory(p.category),
      note: p.note || p.description || '',
      date: validateTransactionDate(p.date),
    }))
    saveTransaction(txs)
  }

  const discardSingle = (index: number) => {
    setParsedList((prev) => prev.filter((_, i) => i !== index))
  }

  const discardAll = () => {
    setParsedList([])
    setEditingIndex(null)
    setScanPreviewUrl(null)
    setScannedFileMeta(null)
    setAmount('')
    setCategory('')
    setNote('')
    setType('expense')
    setDate(getTodayIST())
    setAmountError('')
    setCategoryError('')
  }

  /* ── Editing a specific parsed transaction ── */
  if (editingIndex !== null) {
    return (
      <ManualForm
        amount={amount}
        setAmount={setAmount}
        type={type}
        setType={setType}
        category={category}
        setCategory={setCategory}
        note={note}
        setNote={setNote}
        date={date}
        setDate={setDate}
        amountError={amountError}
        setAmountError={setAmountError}
        categoryError={categoryError}
        setCategoryError={setCategoryError}
        availableCategories={availableCategories}
        isSubmitting={isSubmitting}
        onSave={handleConfirmEdit}
        onDiscard={() => setEditingIndex(null)}
        confirmMode
      />
    )
  }

  /* ── Single transaction preview ── */
  if (parsedList.length === 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520, margin: '0 auto', fontFamily: FONT }}>
        {scannedFileMeta && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 14,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              fontSize: 12.5,
              color: '#166534',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {scannedFileMeta.isPdf ? <FileText size={15} /> : <Receipt size={15} />}
              {scannedFileMeta.name}
            </span>
            <span style={{ fontSize: 11, opacity: 0.8, flexShrink: 0 }}>{scannedFileMeta.size}</span>
          </div>
        )}
        <PreviewCard
          parsed={parsedList[0]}
          onEdit={() => handleEditStart(0)}
          onConfirm={() => handleConfirmSingle(0)}
          onDiscard={discardAll}
          isSubmitting={isSubmitting}
        />
      </div>
    )
  }

  /* ── Multiple transactions (e.g. from PDF statement or multi-item bill) ── */
  if (parsedList.length > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520, margin: '0 auto', fontFamily: FONT }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 14,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: `${TEAL}18`,
                color: TEAL,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {scannedFileMeta?.isPdf ? <FileText size={16} /> : <ScanLine size={16} />}
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#0f172a', fontWeight: 700, margin: 0 }}>
                {parsedList.length} transactions extracted
              </p>
              {scannedFileMeta && (
                <p style={{ fontSize: 11.5, color: '#64748b', margin: 0 }}>
                  {scannedFileMeta.name} · {scannedFileMeta.size}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={discardAll}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#ef4444',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: FONT,
            }}
          >
            {t('discardAll')}
          </button>
        </div>

        {parsedList.map((p, i) => (
          <PreviewCard
            key={i}
            parsed={p}
            onEdit={() => handleEditStart(i)}
            onConfirm={() => handleConfirmSingle(i)}
            onDiscard={() => discardSingle(i)}
            isSubmitting={isSubmitting}
          />
        ))}

        <button
          onClick={handleConfirmAll}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: 15,
            background: isSubmitting ? '#d1d5db' : `linear-gradient(135deg, ${TEAL}, #059669)`,
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontFamily: FONT,
            boxShadow: '0 10px 24px -6px rgba(0, 184, 148, 0.35)',
          }}
        >
          {isSubmitting ? t('saving') : t('saveAll', { count: parsedList.length })}
        </button>
      </div>
    )
  }

  /* ── Scan Idle / Loading View ── */
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        maxWidth: 520,
        margin: '0 auto',
        paddingTop: 4,
        fontFamily: FONT,
      }}
    >
      <style>{`
        @keyframes scannerLaser {
          0%, 100% { top: 12%; opacity: 0.85; }
          50% { top: 84%; opacity: 1; }
        }
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>

      {/* Hidden File Inputs for Camera, Image Gallery, and PDF Document */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFileUpload(f)
          e.target.value = ''
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFileUpload(f)
          e.target.value = ''
        }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFileUpload(f)
          e.target.value = ''
        }}
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Active Scanning Preview Window (Image OR PDF Card with sweeping laser) */}
          <div
            style={{
              position: 'relative',
              borderRadius: 20,
              overflow: 'hidden',
              border: `1.5px solid ${TEAL}45`,
              background: '#0f172a',
              minHeight: 170,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Sweeping Laser Line */}
            <div
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                height: 2.5,
                background: 'linear-gradient(90deg, transparent, #2dd4bf, #10b981, transparent)',
                boxShadow: '0 0 16px 3px rgba(45, 212, 191, 0.75)',
                zIndex: 10,
                animation: 'scannerLaser 2.2s ease-in-out infinite',
              }}
            />

            {scanPreviewUrl ? (
              <Image
                src={scanPreviewUrl}
                alt="Receipt preview"
                width={480}
                height={220}
                unoptimized
                style={{
                  width: '100%',
                  maxHeight: 220,
                  objectFit: 'cover',
                  opacity: 0.72,
                }}
              />
            ) : (
              /* Dedicated PDF / Document Scanning Visual */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  padding: '28px 20px',
                  color: '#fff',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: 'rgba(20, 184, 166, 0.18)',
                    border: '1px solid rgba(45, 212, 191, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2dd4bf',
                  }}
                >
                  <FileText size={28} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                    {scannedFileMeta?.name || 'Scanning Document...'}
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                    {scannedFileMeta?.size ? `${scannedFileMeta.size} · PDF AI Extraction` : 'AI Vision Processing'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <ScanProgress currentStep={scanStep} />
        </div>
      ) : (
        <>
          {/* ─── 1. Interactive AI Viewfinder Hero Card ─── */}
          <BorderBeam size="sm" colorVariant="ocean" strength={0.65} theme="light" borderRadius={24}>
            <div
              onClick={() => cameraInputRef.current?.click()}
              style={{
                position: 'relative',
                borderRadius: 24,
                background: 'linear-gradient(145deg, #f0fdf9 0%, #ffffff 55%, #f0f9ff 100%)',
                border: '1.5px solid #ccfbf1',
                padding: '26px 20px 22px',
                textAlign: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                boxShadow: '0 12px 32px -12px rgba(13, 148, 136, 0.12)',
              }}
            >
              {/* Viewfinder Corner Brackets */}
              <div style={{ position: 'absolute', top: 14, left: 14, width: 18, height: 18, borderTop: `2.5px solid ${TEAL}`, borderLeft: `2.5px solid ${TEAL}`, borderTopLeftRadius: 6 }} />
              <div style={{ position: 'absolute', top: 14, right: 14, width: 18, height: 18, borderTop: `2.5px solid ${TEAL}`, borderRight: `2.5px solid ${TEAL}`, borderTopRightRadius: 6 }} />
              <div style={{ position: 'absolute', bottom: 14, left: 14, width: 18, height: 18, borderBottom: `2.5px solid ${TEAL}`, borderLeft: `2.5px solid ${TEAL}`, borderBottomLeftRadius: 6 }} />
              <div style={{ position: 'absolute', bottom: 14, right: 14, width: 18, height: 18, borderBottom: `2.5px solid ${TEAL}`, borderRight: `2.5px solid ${TEAL}`, borderBottomRightRadius: 6 }} />

              {/* Animated Visual Mockup inside Viewfinder */}
              <div
                style={{
                  position: 'relative',
                  width: 110,
                  height: 88,
                  margin: '0 auto 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'subtleFloat 3.2s ease-in-out infinite',
                }}
              >
                {/* Back PDF Card */}
                <div
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: 6,
                    width: 54,
                    height: 68,
                    borderRadius: 12,
                    background: '#fff7ed',
                    border: '1.5px solid #fed7aa',
                    transform: 'rotate(10deg)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.10)',
                  }}
                >
                  <FileText size={20} color="#ea580c" />
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#c2410c', letterSpacing: 0.4 }}>PDF</span>
                </div>

                {/* Front Receipt Card */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    width: 64,
                    height: 76,
                    borderRadius: 14,
                    background: '#ffffff',
                    border: `1.5px solid ${TEAL}55`,
                    transform: 'rotate(-4deg)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    boxShadow: '0 10px 24px -6px rgba(0, 184, 148, 0.22)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Mini sweeping laser inside icon */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 4,
                      right: 4,
                      height: 2,
                      background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`,
                      animation: 'scannerLaser 2.4s ease-in-out infinite',
                    }}
                  />
                  <ScanLine size={28} color={TEAL} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#0f766e', letterSpacing: 0.4 }}>SCAN</span>
                </div>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: '#ccfbf1',
                  color: '#0f766e',
                  fontSize: 11,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                <Sparkles size={12} />
                <span>AI Receipt &amp; PDF Scanner</span>
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                Snap a bill or upload a PDF
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 auto', maxWidth: 320, lineHeight: 1.45 }}>
                Extracts merchant, date, category, and exact ₹ amount in seconds.
              </p>
            </div>
          </BorderBeam>

          {/* ─── 2. Primary Camera Action Button ─── */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '15px 18px',
              background: `linear-gradient(135deg, ${TEAL} 0%, #059669 100%)`,
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontFamily: FONT,
              boxShadow: '0 10px 24px -6px rgba(0, 184, 148, 0.4)',
            }}
          >
            <Camera size={20} />
            <span>{t('openCamera')}</span>
          </button>

          {/* ─── 3. Dedicated Split Cards: Gallery Photo vs PDF Document ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Upload Receipt Image from Gallery */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              style={{
                padding: '14px 12px',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 16,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
                textAlign: 'left',
                fontFamily: FONT,
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: '#eef2ff',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ImageIcon size={19} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {t('uploadGallery')}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  JPG, PNG &amp; UPI screenshots
                </div>
              </div>
            </button>

            {/* Upload PDF Invoice / Statement */}
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              style={{
                padding: '14px 12px',
                background: '#ffffff',
                border: '1.5px solid #fed7aa',
                borderRadius: 16,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
                textAlign: 'left',
                fontFamily: FONT,
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.04)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: '#fff7ed',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={19} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Upload PDF Bill
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Invoices &amp; PDF statements
                </div>
              </div>
            </button>
          </div>

          {/* ─── 4. What You Can Scan Strip (Helpful Context) ─── */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 16,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Supported Formats
              </span>
              <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={13} />
                {t('scanSupported')}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { title: 'Paper Bills', sub: 'Shops & dining', icon: Receipt, color: '#0d9488', bg: '#f0fdfa' },
                { title: 'Screenshots', sub: 'UPI & food apps', icon: Upload, color: '#4f46e5', bg: '#eef2ff' },
                { title: 'PDF Files', sub: 'Multi-item bills', icon: FileText, color: '#ea580c', bg: '#fff7ed' },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 12,
                    background: '#ffffff',
                    border: '1px solid #f1f5f9',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: item.bg,
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 6px',
                    }}
                  >
                    <item.icon size={15} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{item.title}</div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
