'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCategoriesByType } from '@/lib/categories'
import { validateTransactionDate } from '@/lib/validateTransactionDate'
import { TEAL, FONT, ParsedTransaction, getTodayIST, resolveCategory } from '../constants'
import { useTransaction } from '../hooks/useTransaction'
import { PreviewCard } from './PreviewCard'
import { ManualForm } from './ManualTab'

const ParticleSphere = dynamic(() => import('./ParticleSphere'), { ssr: false })

const MAX_RECORDING_SECONDS = 15

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
    setParsedList([])
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
          const result = await mistralRes.json()
          const txs: ParsedTransaction[] = result.transactions || [result]
          txs.forEach(tx => { tx.date = validateTransactionDate(tx.date) })
          if (txs.length === 1) fillForm(txs[0])
          setParsedList(txs)
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
    setParsedList([])
    setParseError(null)
  }

  const handleVoiceReRecord = () => {
    setParsedList([])
    setParseError(null)
    setTranscript('')
    setEditingIndex(null)
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

  /* ── Recording / idle UI with Three.js particle sphere ── */
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 16, fontFamily: FONT,
    }}>
      {/* Three.js Particle Sphere — tap to start/stop recording */}
      <ParticleSphere
        isRecording={isListening}
        onTap={isListening ? handleVoiceStop : handleVoiceStart}
      />

      {/* Status text */}
      <p style={{ color: isListening ? TEAL : '#6b7280', fontSize: 16, fontWeight: 500 }}>
        {isListening ? 'Listening... Tap to stop' : 'Tap the sphere to speak'}
      </p>
      <p style={{ color: '#9ca3af', fontSize: 12 }}>
        Supports Hindi, Bengali, Tamil, Telugu & more
      </p>

      {/* Recording progress + Cancel */}
      {isListening && (
        <>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: TEAL, fontWeight: 500 }}>
              {recordingTime}s / {MAX_RECORDING_SECONDS}s
            </p>
            <div style={{
              width: 200, height: 4, background: '#e5e7eb',
              borderRadius: 2, marginTop: 4,
            }}>
              <div style={{
                width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%`,
                height: '100%', background: TEAL,
                borderRadius: 2, transition: 'width 0.3s',
              }} />
            </div>
          </div>

          {/* Cancel button */}
          <button
            onClick={handleVoiceCancel}
            style={{
              padding: '10px 28px', borderRadius: 20,
              border: `1.5px solid ${TEAL}40`,
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

      {/* Parse error → Re-record */}
      {parseError && !loading && (
        <div style={{
          width: '100%', padding: 16, background: '#fef9f0',
          borderRadius: 12, border: '1px solid #f9731630',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <p style={{ fontSize: 14, color: '#b45309', textAlign: 'center' }}>{parseError}</p>
          <button
            onClick={handleVoiceReRecord}
            style={{
              padding: '10px 24px', borderRadius: 20,
              border: `1.5px solid ${TEAL}40`,
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
      {transcript && !loading && parsedList.length === 0 && !parseError && (
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
