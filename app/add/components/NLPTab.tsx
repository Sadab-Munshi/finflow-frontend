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
  // Support both single and multiple parsed transactions
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
      const result = await res.json()
      // API returns { transactions: [...] }, with fallback for legacy single-object format
      const txs: ParsedTransaction[] = result.transactions || [result]
      txs.forEach(tx => { tx.date = validateTransactionDate(tx.date) })
      setParsedList(txs)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmSingle = (index: number) => {
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
    // Remove from list after confirm
    setParsedList(prev => prev.filter((_, i) => i !== index))
  }

  const handleConfirmAll = () => {
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

  const discardSingle = (index: number) => {
    setParsedList(prev => prev.filter((_, i) => i !== index))
  }

  const discardAll = () => {
    setParsedList([])
    setEditingIndex(null)
    setTextInput('')
    setAmount('')
    setCategory('')
    setNote('')
    setType('expense')
    setDate(getTodayIST())
    setAmountError('')
    setCategoryError('')
  }

  /* ── Editing a specific transaction ── */
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

  /* ── Show parsed results ── */
  if (parsedList.length === 1) {
    return (
      <PreviewCard
        parsed={parsedList[0]}
        onEdit={() => handleEditStart(0)}
        onConfirm={() => handleConfirmSingle(0)}
        onDiscard={discardAll}
        isSubmitting={isSubmitting}
      />
    )
  }

  if (parsedList.length > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 15, color: '#374151', fontWeight: 600 }}>
            {parsedList.length} transactions found
          </p>
          <button
            onClick={discardAll}
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

  /* ── Input UI ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      <div style={{ position: 'relative' }}>
        <textarea
          rows={4}
          placeholder='e.g. "Spent 2000 on food and 290 on transport"'
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
