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
  Receipt,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { getCategoriesByType } from '@/lib/categories'
import { validateTransactionDate } from '@/lib/validateTransactionDate'
import { FONT, ParsedTransaction, getTodayIST, resolveCategory } from '../constants'
import { useTransaction } from '../hooks/useTransaction'
import { PreviewCard } from './PreviewCard'
import { ManualForm } from './ManualTab'
import { aiParseReceipt } from '@/lib/api-client'
import {
  compressImageToBudget,
  base64ByteLength,
  MAX_UPLOAD_BYTES,
} from '@/lib/image-compress'

const CAMERA_TEAL = '#0d9488'
const UPLOAD_INDIGO = '#4f46e5'

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
        gap: 14,
        padding: '18px 20px',
        background: '#ffffff',
        borderRadius: 18,
        border: '1.5px solid #e2e8f0',
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <motion.p
          key={currentStep}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ color: '#0f172a', fontWeight: 700, fontSize: 14.5, margin: 0 }}
        >
          {currentStep < SCAN_STEPS.length
            ? t(SCAN_STEPS[currentStep].label as 'readingImage' | 'extractingText' | 'parsingDetails' | 'scanDone')
            : t('scanDone')}
        </motion.p>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: CAMERA_TEAL,
            background: '#f0fdfa',
            border: '1px solid #ccfbf1',
            padding: '2px 10px',
            borderRadius: 999,
          }}
        >
          {pct}%
        </span>
      </div>

      <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div
          style={{
            height: '100%',
            background: CAMERA_TEAL,
            borderRadius: 999,
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%', marginTop: 2 }}>
        {SCAN_STEPS.map((step, i) => {
          const done = i < currentStep || (i === SCAN_STEPS.length - 1 && currentStep >= SCAN_STEPS.length - 1)
          const active = i === currentStep && currentStep < SCAN_STEPS.length - 1
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: done ? CAMERA_TEAL : active ? '#f0fdfa' : '#f8fafc',
                  border: active ? `2px solid ${CAMERA_TEAL}` : done ? 'none' : '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.25s',
                  flexShrink: 0,
                }}
              >
                {done ? (
                  <Check size={12} color="#fff" />
                ) : active ? (
                  <motion.div
                    style={{ width: 7, height: 7, borderRadius: '50%', background: CAMERA_TEAL }}
                    animate={{ scale: [1, 1.35, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                ) : (
                  <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>{i + 1}</span>
                )}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: done || active ? 600 : 400,
                  color: done ? CAMERA_TEAL : active ? '#0f172a' : '#94a3b8',
                  transition: 'all 0.25s',
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

export default function ScanTab() {
  const t = useTranslations('add')
  const { saveTransaction, isSubmitting, currentUser } = useTransaction()
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
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
        // Compressed to a byte budget so the payload survives the /api/*
        // Vercel proxy (which rejects bodies above ~4.5 MB).
        const compressed = await compressImageToBudget(file, MAX_UPLOAD_BYTES)
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

        // A PDF can't be downscaled in the browser; refuse it here rather
        // than letting the proxy answer with an opaque 413.
        if (base64ByteLength(base64) > MAX_UPLOAD_BYTES) {
          throw new Error(t('fileTooLarge'))
        }
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
      setAmountError(t('amountError'))
      valid = false
    }
    if (!category) {
      setCategoryError(t('categoryError'))
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>
        {scannedFileMeta && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 14px',
              borderRadius: 12,
              background: '#f0fdfa',
              border: '1px solid #ccfbf1',
              fontSize: 12.5,
              color: '#0f766e',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {scannedFileMeta.isPdf ? <FileText size={15} /> : <Receipt size={15} />}
              {scannedFileMeta.name}
            </span>
            <span style={{ fontSize: 11, opacity: 0.85, flexShrink: 0 }}>{scannedFileMeta.size}</span>
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

  /* ── Multiple transactions (PDF statement or multi-item bill) ── */
  if (parsedList.length > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 14,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: '#f0fdfa',
                border: '1px solid #ccfbf1',
                color: CAMERA_TEAL,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {scannedFileMeta?.isPdf ? <FileText size={16} /> : <ScanLine size={16} />}
            </div>
            <div>
              <p style={{ fontSize: 13.5, color: '#0f172a', fontWeight: 700, margin: 0 }}>
                {t('transactionsFound', { count: parsedList.length })}
              </p>
              {scannedFileMeta && (
                <p style={{ fontSize: 11.5, color: '#64748b', margin: 0 }}>
                  {scannedFileMeta.name} · {scannedFileMeta.size}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={discardAll}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#ef4444',
              fontSize: 12.5,
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
          type="button"
          onClick={handleConfirmAll}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '15px 18px',
            background: isSubmitting ? '#e5e7eb' : CAMERA_TEAL,
            color: isSubmitting ? '#94a3b8' : '#ffffff',
            border: 'none',
            borderRadius: 14,
            fontSize: 15.5,
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontFamily: FONT,
            transition: 'all 0.2s',
          }}
        >
          {isSubmitting ? t('saving') : t('saveAll', { count: parsedList.length })}
        </button>
      </div>
    )
  }

  /* ── Clean Minimal Scan Idle / Loading View ── */
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        fontFamily: FONT,
      }}
    >
      <style>{`
        @keyframes scannerSweep {
          0%, 100% { top: 14%; opacity: 0.75; }
          50% { top: 82%; opacity: 1; }
        }
      `}</style>

      {/* 1. Gallery Photo Picker (triggered by tapping top scanner box) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFileUpload(f)
          e.target.value = ''
        }}
      />

      {/* 2. Rear Camera Picker (triggered by left Open Camera button) */}
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

      {/* 3. Document / File Picker (triggered by right Upload File button) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf,image/*,.heic,.webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFileUpload(f)
          e.target.value = ''
        }}
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              position: 'relative',
              borderRadius: 18,
              overflow: 'hidden',
              border: '1.5px solid #cbd5e1',
              background: '#0f172a',
              minHeight: 164,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 14,
                right: 14,
                height: 2,
                background: 'linear-gradient(90deg, transparent, #2dd4bf, #0d9488, transparent)',
                boxShadow: '0 0 12px 2px rgba(45, 212, 191, 0.65)',
                zIndex: 10,
                animation: 'scannerSweep 2s ease-in-out infinite',
              }}
            />

            {scanPreviewUrl ? (
              <Image
                src={scanPreviewUrl}
                alt="Receipt preview"
                width={480}
                height={200}
                unoptimized
                style={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  opacity: 0.74,
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  padding: '26px 20px',
                  color: '#ffffff',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 14,
                    background: 'rgba(13, 148, 136, 0.22)',
                    border: '1px solid rgba(45, 212, 191, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2dd4bf',
                  }}
                >
                  <FileText size={24} />
                </div>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0, color: '#f8fafc' }}>
                    {scannedFileMeta?.name || t('scanning')}
                  </p>
                  {scannedFileMeta?.size && (
                    <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '3px 0 0' }}>
                      {scannedFileMeta.size}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <ScanProgress currentStep={scanStep} />
        </div>
      ) : (
        <>
          {/* ─── 1. Scanner Viewfinder Card (Tap opens Gallery directly) ─── */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => galleryInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                galleryInputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              const dropped = e.dataTransfer.files?.[0]
              if (dropped) handleFileUpload(dropped)
            }}
            style={{
              position: 'relative',
              borderRadius: 20,
              background: isDragging ? '#f0fdfa' : '#f8fafc',
              border: isDragging ? `1.5px dashed ${CAMERA_TEAL}` : '1.5px dashed #cbd5e1',
              padding: '28px 16px 32px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Subtle Viewfinder Corner Brackets */}
            <div style={{ position: 'absolute', top: 13, left: 13, width: 14, height: 14, borderTop: `2px solid ${CAMERA_TEAL}`, borderLeft: `2px solid ${CAMERA_TEAL}`, borderTopLeftRadius: 5, opacity: 0.6 }} />
            <div style={{ position: 'absolute', top: 13, right: 13, width: 14, height: 14, borderTop: `2px solid ${CAMERA_TEAL}`, borderRight: `2px solid ${CAMERA_TEAL}`, borderTopRightRadius: 5, opacity: 0.6 }} />
            <div style={{ position: 'absolute', bottom: 13, left: 13, width: 14, height: 14, borderBottom: `2px solid ${CAMERA_TEAL}`, borderLeft: `2px solid ${CAMERA_TEAL}`, borderBottomLeftRadius: 5, opacity: 0.6 }} />
            <div style={{ position: 'absolute', bottom: 13, right: 13, width: 14, height: 14, borderBottom: `2px solid ${CAMERA_TEAL}`, borderRight: `2px solid ${CAMERA_TEAL}`, borderBottomRightRadius: 5, opacity: 0.6 }} />

            {/* Clean Centered Scanner Emblem */}
            <div
              style={{
                position: 'relative',
                width: 60,
                height: 60,
                borderRadius: 18,
                background: '#ffffff',
                border: '1px solid #ccfbf1',
                boxShadow: '0 8px 20px -6px rgba(13, 148, 136, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  right: 8,
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${CAMERA_TEAL}, transparent)`,
                  animation: 'scannerSweep 2.6s ease-in-out infinite',
                }}
              />
              <ScanLine size={27} color={CAMERA_TEAL} />
            </div>

            <h3 style={{ fontSize: 16.5, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              {t('scanTitle')}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 auto 14px', maxWidth: 300, lineHeight: 1.45 }}>
              {t('scanSubtitle')}
            </p>

            {/* Clean Single-Row Format Pills */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {[t('scanFormatImg'), t('scanFormatUpi'), t('scanFormatPdf')].map((badge) => (
                <span
                  key={badge}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#475569',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '3.5px 9px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* ─── 2. Distinct Side-by-Side Primary Buttons: Open Camera (Teal) | Upload File (Indigo) ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => cameraInputRef.current?.click()}
              style={{
                height: 48,
                padding: '0 10px',
                background: CAMERA_TEAL,
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                fontSize: 13.5,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontFamily: FONT,
                boxShadow: '0 6px 16px -6px rgba(13, 148, 136, 0.45)',
              }}
            >
              <Camera size={17} style={{ flexShrink: 0 }} />
              <span>{t('openCamera')}</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                height: 48,
                padding: '0 10px',
                background: UPLOAD_INDIGO,
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                fontSize: 13.5,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontFamily: FONT,
                boxShadow: '0 6px 16px -6px rgba(79, 70, 229, 0.42)',
              }}
            >
              <Upload size={17} style={{ flexShrink: 0 }} />
              <span>{t('uploadFile')}</span>
            </motion.button>
          </div>
        </>
      )}
    </div>
  )
}
