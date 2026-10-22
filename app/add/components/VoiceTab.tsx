'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Mic, Check, X, RotateCcw, AlertCircle } from 'lucide-react'
import { getCategoriesByType } from '@/lib/categories'
import { validateTransactionDate } from '@/lib/validateTransactionDate'
import { FONT, ParsedTransaction, getTodayIST, resolveCategory } from '../constants'
import { useTransaction } from '../hooks/useTransaction'
import { PreviewCard } from './PreviewCard'
import { ManualForm } from './ManualTab'
import { aiSpeechToText, aiParseText } from '@/lib/api-client'

const BRAND_TEAL = '#0d9488'
const MAX_RECORDING_SECONDS = 15
const VOICE_ERROR_PROCESSING = 'error'
const VOICE_ERROR_MIC = 'mic'

const SUPPORTED_LANGUAGES = ['English', 'हिन्दी', 'বাংলা', 'தமிழ்', 'తెలుగు']
const WAVE_DELAYS = [0, 90, 180, 270, 360, 140, 40, 220, 320, 110, 250, 160, 70]

/* 1 English, 1 Hindi, 1 Bengali natural spoken examples */
const MULTILINGUAL_VOICE_EXAMPLES = [
  { lang: 'EN', text: 'Spent 280 on lunch and 90 on auto' },
  { lang: 'हिन्दी', text: 'आज बिजली बिल में 1,450 दिए' },
  { lang: 'বাংলা', text: 'বাজারে 640 আর চায়ে 40 খরচ করলাম' },
]

export default function VoiceTab() {
  const t = useTranslations('add')
  const { saveTransaction, isSubmitting, currentUser } = useTransaction()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [parsedList, setParsedList] = useState<ParsedTransaction[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const cancelledRef = useRef(false)

  // Edit form state
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getTodayIST())
  const [amountError, setAmountError] = useState('')
  const [categoryError, setCategoryError] = useState('')

  const availableCategories = getCategoriesByType(type)

  /* Recording timer with 15s auto-stop */
  useEffect(() => {
    if (!isListening) {
      setRecordingTime(0)
      return
    }
    const timer = setInterval(() => {
      setRecordingTime((prev) => {
        const next = prev + 1
        if (next >= MAX_RECORDING_SECONDS) {
          handleVoiceStop()
          clearInterval(timer)
          return MAX_RECORDING_SECONDS
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening])

  const fillForm = (p: ParsedTransaction) => {
    setAmount(String(p.amount || ''))
    setType(p.type || 'expense')
    setCategory(resolveCategory(p.category))
    setNote(p.note || p.description || '')
    setDate(validateTransactionDate(p.date))
    setAmountError('')
    setCategoryError('')
  }

  const handleVoiceStart = async () => {
    cancelledRef.current = false
    setTranscript('')
    setParsedList([])
    setParseError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        if (cancelledRef.current) {
          cancelledRef.current = false
          return
        }
        setLoading(true)
        try {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')

          const { transcript: spoken } = await aiSpeechToText(formData)
          setTranscript(spoken)

          const result = await aiParseText(spoken)
          const txs: ParsedTransaction[] = result.transactions || [result]
          txs.forEach((tx) => {
            tx.date = validateTransactionDate(tx.date)
          })
          if (txs.length === 1) fillForm(txs[0])
          setParsedList(txs)
        } catch {
          setParseError(VOICE_ERROR_PROCESSING)
        } finally {
          setLoading(false)
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsListening(true)
    } catch {
      setParseError(VOICE_ERROR_MIC)
    }
  }

  const handleVoiceStop = () => {
    cancelledRef.current = false
    mediaRecorderRef.current?.stop()
    setIsListening(false)
  }

  const handleVoiceCancel = () => {
    cancelledRef.current = true
    mediaRecorderRef.current?.stop()
    setIsListening(false)
    setRecordingTime(0)
  }

  const handleSaveSingle = (index: number) => {
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

  const handleSaveAll = () => {
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

  const discard = () => {
    setParsedList([])
    setParseError(null)
    setTranscript('')
    setEditingIndex(null)
    setAmount('')
    setCategory('')
    setNote('')
    setType('expense')
    setDate(getTodayIST())
    setAmountError('')
    setCategoryError('')
  }

  const discardSingle = (index: number) => {
    setParsedList((prev) => prev.filter((_, i) => i !== index))
  }

  /* ── Edit form ── */
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

  /* ── Voice Preview: single transaction ── */
  if (parsedList.length === 1) {
    return (
      <PreviewCard
        parsed={parsedList[0]}
        onEdit={() => {
          fillForm(parsedList[0])
          setEditingIndex(0)
        }}
        onConfirm={() => handleSaveSingle(0)}
        onDiscard={discard}
        isSubmitting={isSubmitting}
        confirmLabel={t('saveTransaction')}
        headerIcon={<Mic size={16} color={BRAND_TEAL} />}
        headerText={transcript ? `"${transcript}"` : undefined}
      />
    )
  }

  /* ── Voice Preview: multiple transactions ── */
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mic size={16} color={BRAND_TEAL} />
            <p style={{ fontSize: 13.5, color: '#0f172a', fontWeight: 700, margin: 0 }}>
              {t('transactionsFound', { count: parsedList.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={discard}
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
            onEdit={() => {
              fillForm(p)
              setEditingIndex(i)
            }}
            onConfirm={() => handleSaveSingle(i)}
            onDiscard={() => discardSingle(i)}
            isSubmitting={isSubmitting}
          />
        ))}
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '15px 18px',
            background: isSubmitting ? '#e5e7eb' : BRAND_TEAL,
            color: isSubmitting ? '#94a3b8' : '#ffffff',
            border: 'none',
            borderRadius: 14,
            fontSize: 15.5,
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontFamily: FONT,
          }}
        >
          {isSubmitting ? t('saving') : t('saveAll', { count: parsedList.length })}
        </button>
      </div>
    )
  }

  /* ── Clean Minimal Voice UI (No idle header badge, 1 EN + 1 HI + 1 BN examples) ── */
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
        @keyframes voiceWaveBar {
          0%, 100% { transform: scaleY(0.24); opacity: 0.55; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes livePulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>

      {/* ─── Main Voice Capture Card ─── */}
      <div
        style={{
          borderRadius: 20,
          background: isListening ? '#f0fdfa' : '#f8fafc',
          border: isListening ? `1.5px solid ${BRAND_TEAL}` : '1.5px solid #e2e8f0',
          padding: '26px 16px 22px',
          textAlign: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Active Recording Timer Pill (shown only while actively recording) */}
        {isListening && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              background: '#ffffff',
              border: '1px solid #99f6e4',
              color: '#0f766e',
              fontSize: 11.5,
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#ef4444',
                animation: 'livePulseDot 1s ease-in-out infinite',
              }}
            />
            <span>
              0:{String(recordingTime).padStart(2, '0')} / 0:{MAX_RECORDING_SECONDS}
            </span>
          </div>
        )}

        {/* Center Tactile Mic Control / Waveform */}
        <div
          style={{
            minHeight: 112,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          {isListening ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  height: 52,
                }}
              >
                {WAVE_DELAYS.map((delay, i) => (
                  <div
                    key={i}
                    style={{
                      width: 4.5,
                      height: i % 3 === 0 ? 46 : i % 2 === 0 ? 34 : 26,
                      borderRadius: 999,
                      backgroundColor: BRAND_TEAL,
                      transformOrigin: 'center',
                      animation: `voiceWaveBar 0.78s ${delay}ms infinite ease-in-out`,
                    }}
                  />
                ))}
              </div>

              <div style={{ width: '100%', maxWidth: 220, height: 4, background: '#ccfbf1', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min((recordingTime / MAX_RECORDING_SECONDS) * 100, 100)}%`,
                    background: BRAND_TEAL,
                    borderRadius: 999,
                    transition: 'width 0.9s linear',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleVoiceCancel}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 999,
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: FONT,
                  }}
                >
                  <X size={14} />
                  <span>{t('cancel')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleVoiceStop}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 999,
                    background: BRAND_TEAL,
                    border: `1.5px solid ${BRAND_TEAL}`,
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: FONT,
                    boxShadow: '0 6px 16px -6px rgba(13, 148, 136, 0.45)',
                  }}
                >
                  <Check size={14} />
                  <span>{t('stopAndParse')}</span>
                </button>
              </div>
            </div>
          ) : loading ? (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: '#f0fdfa',
                border: '1.5px solid #99f6e4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Loader2 size={32} className="animate-spin" style={{ color: BRAND_TEAL }} />
            </div>
          ) : (
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleVoiceStart}
              aria-label={t('tapToSpeak')}
              style={{
                width: 108,
                height: 108,
                borderRadius: '50%',
                background: '#f0fdfa',
                border: '1.5px solid #ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: '50%',
                  background: BRAND_TEAL,
                  boxShadow: '0 10px 24px -6px rgba(13, 148, 136, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Mic size={32} />
              </span>
            </motion.button>
          )}
        </div>

        {/* Instruction Title + Supported Languages */}
        <h3 style={{ fontSize: 15.5, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
          {isListening ? t('listening') : loading ? t('processing') : t('voiceHeading')}
        </h3>
        <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px' }}>
          {isListening ? t('listeningSubhint') : t('voiceSubhint')}
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <span
              key={lang}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#475569',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '3.5px 9px',
                borderRadius: 999,
              }}
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Friendly Inline Error Banner ─── */}
      {parseError && !loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 14,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 12.5,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.4 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{parseError === VOICE_ERROR_MIC ? t('micDenied') : t('voiceUnclear')}</span>
          </span>
          <button
            type="button"
            onClick={handleVoiceStart}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              background: '#ffffff',
              border: '1px solid #fca5a5',
              color: '#b91c1c',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
              fontFamily: FONT,
            }}
          >
            <RotateCcw size={12} />
            <span>{t('tryAgain')}</span>
          </button>
        </div>
      )}

      {/* ─── Transcript Card (when captured with 0 parsed items) ─── */}
      {transcript && !loading && parsedList.length === 0 && !parseError && (
        <div
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#f0fdfa',
            border: '1px solid #ccfbf1',
            borderRadius: 14,
          }}
        >
          <p style={{ fontSize: 11.5, color: '#0f766e', fontWeight: 600, margin: '0 0 4px' }}>
            {t('transcript')}
          </p>
          <p style={{ fontSize: 13.5, color: '#0f172a', fontWeight: 500, margin: 0 }}>{transcript}</p>
        </div>
      )}

      {/* ─── Multilingual Examples: 1 English, 1 Hindi, 1 Bengali ─── */}
      {!isListening && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 2 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {t('voiceTrySaying')}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MULTILINGUAL_VOICE_EXAMPLES.map((item) => (
              <div
                key={item.lang}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 11px',
                  borderRadius: 12,
                  background: '#ffffff',
                  border: '1px solid #f1f5f9',
                  fontSize: 12.5,
                  color: '#334155',
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#0f766e',
                    background: '#f0fdfa',
                    border: '1px solid #ccfbf1',
                    borderRadius: 6,
                    padding: '2px 6px',
                    flexShrink: 0,
                  }}
                >
                  {item.lang}
                </span>
                <span style={{ lineHeight: 1.4 }}>&ldquo;{item.text}&rdquo;</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
