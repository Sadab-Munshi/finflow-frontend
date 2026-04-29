'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Mic } from 'lucide-react'
import { getCategoriesByType } from '@/lib/categories'
import { validateTransactionDate } from '@/lib/validateTransactionDate'
import { TEAL, FONT, ParsedTransaction, getTodayIST, resolveCategory } from '../constants'
import { useTransaction } from '../hooks/useTransaction'
import { PreviewCard } from './PreviewCard'
import { ManualForm } from './ManualTab'
import { aiSpeechToText, aiParseText } from '@/lib/api-client'

const MAX_RECORDING_SECONDS = 15
const VOICE_ERROR_PROCESSING = 'error'
const VOICE_ERROR_MIC = 'mic'

export default function VoiceTab() {
  const { saveTransaction, isSubmitting, currentUser } = useTransaction()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [parsedList, setParsedList] = useState<ParsedTransaction[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // Edit form state
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getTodayIST())
  const [amountError, setAmountError] = useState('')
  const [categoryError, setCategoryError] = useState('')

  const availableCategories = getCategoriesByType(type)

  /* Recording auto-stop timer (hidden from UI) */
  useEffect(() => {
    if (!isListening) { setRecordingTime(0); return }
    const timer = setInterval(() => {
      setRecordingTime(prev => {
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
    setTranscript('')
    setParsedList([])
    setParseError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setLoading(true)
        try {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')

          const { transcript: t } = await aiSpeechToText(formData)
          setTranscript(t)

          const result = await aiParseText(t)
          const txs: ParsedTransaction[] = result.transactions || [result]
          txs.forEach(tx => { tx.date = validateTransactionDate(tx.date) })
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
    mediaRecorderRef.current?.stop()
    setIsListening(false)
  }

  const handleSaveSingle = (index: number) => {
    const p = parsedList[index]
    if (!p) return
    saveTransaction([{
      user_id: currentUser?.userId,
      amount: Number(p.amount) || 0,
      type: p.type || 'expense',
      category: resolveCategory(p.category),
      note: p.note || p.description || '',
      date: validateTransactionDate(p.date),
    }])
    setParsedList(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveAll = () => {
    const txs = parsedList.map(p => ({
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
    if (editingIndex !== null) {
      setParsedList(prev => prev.filter((_, i) => i !== editingIndex))
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
    setParsedList(prev => prev.filter((_, i) => i !== index))
  }

  /* ── Edit form ── */
  if (editingIndex !== null) {
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
        onEdit={() => { fillForm(parsedList[0]); setEditingIndex(0) }}
        onConfirm={() => handleSaveSingle(0)}
        onDiscard={discard}
        isSubmitting={isSubmitting}
        confirmLabel="Save Transaction"
        headerIcon={<span style={{ fontSize: 18 }}>🎤</span>}
        headerText="Voice captured"
      />
    )
  }

  /* ── Voice Preview: multiple transactions ── */
  if (parsedList.length > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 15, color: '#374151', fontWeight: 600 }}>
            🎤 {parsedList.length} transactions found
          </p>
          <button
            onClick={discard}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', fontSize: 13, fontFamily: FONT,
            }}
          >
            Discard all
          </button>
        </div>
        {parsedList.map((p, i) => (
          <PreviewCard
            key={i}
            parsed={p}
            onEdit={() => { fillForm(p); setEditingIndex(i) }}
            onConfirm={() => handleSaveSingle(i)}
            onDiscard={() => discardSingle(i)}
            isSubmitting={isSubmitting}
            confirmLabel="Save"
          />
        ))}
        <button
          onClick={handleSaveAll}
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
          {isSubmitting ? 'Saving...' : `Save All (${parsedList.length})`}
        </button>
      </div>
    )
  }

  /* ── Recording / idle UI with mic + waveform ── */
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 24, fontFamily: FONT,
    }}>
      {/* Waveform CSS keyframes */}
      <style>{`
        @keyframes waveBar {
          0%, 100% { height: 8px; }
          50% { height: 48px; }
        }
      `}</style>

      {/* Mic circle (idle) / Waveform bars (listening) */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 112, cursor: loading ? 'default' : 'pointer',
        }}
        onClick={loading ? undefined : (isListening ? handleVoiceStop : handleVoiceStart)}
      >
        {isListening ? (
          /* Waveform bars */
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 56,
            opacity: 1, transition: 'opacity 0.3s',
          }}>
            {[0, 100, 200, 300, 400].map((delay, i) => (
              <div
                key={i}
                style={{
                  width: 6, borderRadius: 9999,
                  backgroundColor: '#14b8a6',
                  animation: `waveBar 0.8s ${delay}ms infinite ease-in-out`,
                }}
              />
            ))}
          </div>
        ) : (
          /* Static mic circle */
          <div style={{
            width: 112, height: 112, borderRadius: '50%',
            background: '#f5f5f5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.3s',
          }}>
            <Mic size={48} color="#a3a3a3" />
          </div>
        )}
      </div>

      {/* Status text */}
      <div style={{ textAlign: 'center' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: TEAL, justifyContent: 'center' }}>
            <Loader2 size={16} className="animate-spin" />
            <span style={{ fontSize: 16, fontWeight: 500 }}>Processing...</span>
          </div>
        ) : isListening ? (
          <p style={{ color: '#0d9488', fontSize: 14, fontWeight: 500 }}>
            Listening...
          </p>
        ) : (
          <p style={{ color: '#737373', fontSize: 14 }}>
            Tap to speak
          </p>
        )}
        <p style={{ color: '#a3a3a3', fontSize: 12, marginTop: 6 }}>
          Hindi · Bengali · Tamil · Telugu &amp; more
        </p>
      </div>

      {/* Friendly inline error */}
      {parseError && !loading && (
        <p style={{
          fontSize: 14, color: '#9ca3af', textAlign: 'center',
          maxWidth: 260, lineHeight: 1.6,
        }}>
          {parseError === VOICE_ERROR_MIC
            ? 'Microphone access denied. Please allow access and try again.'
            : "Couldn\u2019t catch that. Please tap and try again."}
        </p>
      )}

      {/* Transcript display */}
      {transcript && !loading && parsedList.length === 0 && !parseError && (
        <div style={{
          width: '100%', padding: 16, background: '#f0fdf4',
          borderRadius: 12,
        }}>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Transcript:</p>
          <p style={{ fontWeight: 500 }}>{transcript}</p>
        </div>
      )}
    </div>
  )
}
