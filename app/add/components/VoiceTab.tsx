'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Mic } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCategoriesByType } from '@/lib/categories'
import { validateTransactionDate } from '@/lib/validateTransactionDate'
import { TEAL, RED, FONT, WAVEFORM_BARS, ParsedTransaction, getTodayIST, resolveCategory } from '../constants'
import { useTransaction } from '../hooks/useTransaction'
import { PreviewCard } from './PreviewCard'
import { ManualForm } from './ManualTab'

const MAX_RECORDING_SECONDS = 15

function WaveformBars() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40, marginTop: 16 }}>
      {WAVEFORM_BARS.map((bar, i) => (
        <motion.div
          key={i}
          style={{ width: 3, borderRadius: 2, backgroundColor: RED }}
          animate={{ height: [8, bar.maxHeight, 8] }}
          transition={{ duration: bar.duration, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
        />
      ))}
    </div>
  )
}

export default function VoiceTab() {
  const { saveTransaction, isSubmitting, currentUser } = useTransaction()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)

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

  /* Recording timer */
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
    setParsed(null)
    setParseError(null)
    cancelledRef.current = false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())

        if (cancelledRef.current) {
          cancelledRef.current = false
          return
        }

        setLoading(true)
        try {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')

          const sarvamRes = await fetch('/api/ai/speech-to-text', { method: 'POST', body: formData })
          if (!sarvamRes.ok) {
            const errData = await sarvamRes.json().catch(() => ({}))
            throw new Error(errData.error || `Speech-to-text failed (${sarvamRes.status})`)
          }
          const { transcript: t } = await sarvamRes.json()
          setTranscript(t)

          const mistralRes = await fetch('/api/ai/parse-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: t }),
          })
          if (!mistralRes.ok) {
            const errData = await mistralRes.json().catch(() => ({}))
            throw new Error(errData.error || `Parse failed (${mistralRes.status})`)
          }
          const result: ParsedTransaction = await mistralRes.json()
          result.date = validateTransactionDate(result.date)
          fillForm(result)
          setParsed(result)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Voice processing failed'
          setParseError(msg)
          toast.error(msg)
        } finally {
          setLoading(false)
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsListening(true)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  const handleVoiceStop = () => {
    mediaRecorderRef.current?.stop()
    setIsListening(false)
  }

  const handleVoiceCancel = () => {
    cancelledRef.current = true
    mediaRecorderRef.current?.stop()
    setIsListening(false)
    setTranscript('')
    setParsed(null)
    setParseError(null)
  }

  const handleVoiceReRecord = () => {
    setParsed(null)
    setParseError(null)
    setTranscript('')
    setShowEditForm(false)
  }

  const handleSave = () => {
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

  const discard = () => {
    setParsed(null)
    setParseError(null)
    setTranscript('')
    setShowEditForm(false)
    setAmount('')
    setCategory('')
    setNote('')
    setType('expense')
    setDate(getTodayIST())
    setAmountError('')
    setCategoryError('')
  }

  /* ── Voice Preview (after successful parse) ── */
  if (parsed && !showEditForm) {
    return (
      <PreviewCard
        parsed={parsed}
        onEdit={handleVoiceReRecord}
        onConfirm={handleSave}
        onDiscard={discard}
        isSubmitting={isSubmitting}
        editLabel="Re-record"
        confirmLabel="Save Transaction"
        headerIcon={<span style={{ fontSize: 18 }}>🎤</span>}
        headerText="Voice captured"
      />
    )
  }

  /* ── Edit form (not shown in voice flow — kept for completeness) ── */
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

  /* ── Recording / idle UI ── */
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 16, paddingTop: 32, fontFamily: FONT,
    }}>
      {/* Mic button */}
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

      {/* Recording progress + Cancel */}
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

          {/* Cancel button */}
          <button
            onClick={handleVoiceCancel}
            style={{
              padding: '10px 28px', borderRadius: 20,
              border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#6b7280',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            Cancel
          </button>
        </>
      )}

      {/* Processing spinner */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: TEAL }}>
          <Loader2 size={18} className="animate-spin" />
          <span>Processing...</span>
        </div>
      )}

      {/* Parse error → Re-record only */}
      {parseError && !loading && (
        <div style={{
          width: '100%', padding: 16, background: '#fef2f2',
          borderRadius: 12, border: `1px solid ${RED}30`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <p style={{ fontSize: 14, color: RED, textAlign: 'center' }}>{parseError}</p>
          <button
            onClick={handleVoiceReRecord}
            style={{
              padding: '10px 24px', borderRadius: 20,
              border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#374151',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            Re-record
          </button>
        </div>
      )}

      {/* Transcript display */}
      {transcript && !loading && !parsed && !parseError && (
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
}
