'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
  Loader2,
  Sparkles,
  X,
  UtensilsCrossed,
  Zap,
  Wallet,
  ShoppingBag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getCategoriesByType } from '@/lib/categories'
import { validateTransactionDate } from '@/lib/validateTransactionDate'
import { FONT, ParsedTransaction, getTodayIST, resolveCategory } from '../constants'
import { useTransaction } from '../hooks/useTransaction'
import { PreviewCard } from './PreviewCard'
import { ManualForm } from './ManualTab'
import { aiParseText } from '@/lib/api-client'

const BRAND_TEAL = '#0d9488'

export default function NLPTab() {
  const t = useTranslations('add')
  const { saveTransaction, isSubmitting, currentUser } = useTransaction()
  const [textInput, setTextInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [loading, setLoading] = useState(false)
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
    if (!textInput.trim() || loading) return
    setLoading(true)
    try {
      const result = await aiParseText(textInput)
      const txs: ParsedTransaction[] = result.transactions || [result]
      txs.forEach((tx) => {
        tx.date = validateTransactionDate(tx.date)
      })
      setParsedList(txs)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('parseFailure'))
    } finally {
      setLoading(false)
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

  const discardSingle = (index: number) => {
    setParsedList((prev) => prev.filter((_, i) => i !== index))
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
      <PreviewCard
        parsed={parsedList[0]}
        onEdit={() => handleEditStart(0)}
        onConfirm={() => handleConfirmSingle(0)}
        onDiscard={discardAll}
        isSubmitting={isSubmitting}
      />
    )
  }

  /* ── Multiple transactions preview ── */
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
            <Sparkles size={16} color={BRAND_TEAL} />
            <p style={{ fontSize: 13.5, color: '#0f172a', fontWeight: 700, margin: 0 }}>
              {t('transactionsFound', { count: parsedList.length })}
            </p>
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

  const examples = [
    { text: t('nlpExample1'), Icon: UtensilsCrossed },
    { text: t('nlpExample2'), Icon: Zap },
    { text: t('nlpExample3'), Icon: Wallet },
    { text: t('nlpExample4'), Icon: ShoppingBag },
  ]

  const isDisabled = loading || !textInput.trim()

  /* ── Clean Minimal Fintech Smart Text Entry UI ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
      {/* ─── 1. Smart Text Input Card ─── */}
      <div
        style={{
          background: '#ffffff',
          border: isFocused ? `1.5px solid ${BRAND_TEAL}` : '1.5px solid #e2e8f0',
          borderRadius: 18,
          boxShadow: isFocused
            ? '0 0 0 3px rgba(13, 148, 136, 0.10)'
            : '0 2px 10px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden',
          transition: 'all 0.18s ease',
        }}
      >
        {/* Card Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px 4px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: BRAND_TEAL,
            }}
          >
            <Sparkles size={14} />
            <span>{t('nlpCardTitle')}</span>
          </span>

          {textInput.length > 0 && (
            <button
              type="button"
              onClick={() => setTextInput('')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 999,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              <X size={12} />
              <span>{t('clear')}</span>
            </button>
          )}
        </div>

        {/* Clean Borderless Textarea */}
        <textarea
          rows={3}
          placeholder={t('nlpPlaceholder')}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              handleParse()
            }
          }}
          style={{
            width: '100%',
            padding: '8px 14px 12px',
            border: 'none',
            fontSize: 15.5,
            lineHeight: 1.55,
            color: '#0f172a',
            background: 'transparent',
            resize: 'none',
            outline: 'none',
            fontFamily: FONT,
            boxSizing: 'border-box',
          }}
        />

        {/* Subtle Helper Footer */}
        <div
          style={{
            padding: '8px 14px',
            background: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            fontSize: 11.5,
            color: '#64748b',
          }}
        >
          {t('nlpHint')}
        </div>
      </div>

      {/* ─── 2. Primary Parse Button (matches FinFlow Manual Save button) ─── */}
      <motion.button
        type="button"
        whileTap={isDisabled ? undefined : { scale: 0.985 }}
        onClick={handleParse}
        disabled={isDisabled}
        style={{
          width: '100%',
          padding: '15px 18px',
          background: isDisabled ? '#e5e7eb' : BRAND_TEAL,
          color: isDisabled ? '#94a3b8' : '#ffffff',
          border: 'none',
          borderRadius: 14,
          fontSize: 15.5,
          fontWeight: 600,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontFamily: FONT,
          boxShadow: isDisabled ? 'none' : '0 8px 20px -6px rgba(13, 148, 136, 0.42)',
          transition: 'all 0.2s ease',
        }}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>{t('parsing')}</span>
          </>
        ) : (
          <>
            <Sparkles size={18} />
            <span>{t('parseWithAI')}</span>
          </>
        )}
      </motion.button>

      {/* ─── 3. Quick Example Chips (1-tap fill) ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 2 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {t('quickExamples')}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {examples.map(({ text, Icon }, idx) => {
            const active = textInput === text
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setTextInput(text)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: active ? '#f0fdfa' : '#ffffff',
                  border: active ? `1px solid ${BRAND_TEAL}` : '1px solid #f1f5f9',
                  color: active ? '#0f766e' : '#334155',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: '#f0fdfa',
                    color: BRAND_TEAL,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} />
                </span>
                <span style={{ lineHeight: 1.4 }}>&ldquo;{text}&rdquo;</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
