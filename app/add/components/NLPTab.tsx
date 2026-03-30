'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCategoriesByType } from '@/lib/categories'
import { validateTransactionDate } from '@/lib/validateTransactionDate'
import { TEAL, FONT, ParsedTransaction, getTodayIST, resolveCategory } from '../constants'
import { useTransaction } from '../hooks/useTransaction'
import { PreviewCard } from './PreviewCard'
import { ManualForm } from './ManualTab'

export default function NLPTab() {
  const { saveTransaction, isSubmitting, currentUser } = useTransaction()
  const [textInput, setTextInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null)
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

  const handleParse = async () => {
    if (!textInput.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `AI request failed (${res.status})`)
      }
      const result: ParsedTransaction = await res.json()
      result.date = validateTransactionDate(result.date)
      fillForm(result)
      setParsed(result)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse. Please try again.')
    } finally {
      setLoading(false)
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

  const discard = () => {
    setParsed(null)
    setShowEditForm(false)
    setTextInput('')
    setAmount('')
    setCategory('')
    setNote('')
    setType('expense')
    setDate(getTodayIST())
    setAmountError('')
    setCategoryError('')
  }

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

  return (
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
        onClick={handleParse}
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
}
