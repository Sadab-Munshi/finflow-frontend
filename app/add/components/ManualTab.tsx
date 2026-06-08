'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, X } from 'lucide-react'
import { getCategoriesByType, categories } from '@/lib/categories'
import { Category } from '@/lib/types'
import { validateTransactionDate } from '@/lib/validateTransactionDate'
import {
  TEAL, RED, GREEN, FONT,
  categoryIconMap, formatDateDisplay, getTodayIST,
} from '../constants'
import { useTransaction } from '../hooks/useTransaction'

/* ─── Types ─── */
export interface ManualFormProps {
  amount: string
  setAmount: (v: string) => void
  type: 'income' | 'expense'
  setType: (v: 'income' | 'expense') => void
  category: string
  setCategory: (v: string) => void
  note: string
  setNote: (v: string) => void
  date: string
  setDate: (v: string) => void
  amountError: string
  setAmountError: (v: string) => void
  categoryError: string
  setCategoryError: (v: string) => void
  availableCategories: Category[]
  isSubmitting: boolean
  onSave: () => void
  onDiscard?: () => void
  confirmMode?: boolean
}

/* ─── Category Bottom Sheet ─── */
function CategorySheet({
  open,
  onClose,
  type,
  selected,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  type: 'income' | 'expense'
  selected: string
  onSelect: (name: string) => void
}) {
  const all = categories.filter(c => c.type === type || c.type === 'both')

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
              zIndex: 100,
            }}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: '#fff', borderRadius: '20px 20px 0 0',
              padding: '20px 16px 40px', zIndex: 101,
              maxHeight: '70vh', overflowY: 'auto',
              fontFamily: FONT,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>All Categories</span>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={22} color="#6b7280" />
              </button>
            </div>

            {/* 3-column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {all.map(cat => {
                const Icon = categoryIconMap[cat.name] || MoreHorizontal
                const isSelected = selected === cat.name
                return (
                  <button
                    key={cat.id}
                    onClick={() => { onSelect(cat.name); onClose() }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 6, padding: '14px 8px', borderRadius: 14,
                      border: isSelected ? `2px solid ${TEAL}` : '1.5px solid #e5e7eb',
                      background: isSelected ? `${TEAL}10` : '#fafafa',
                      color: isSelected ? TEAL : '#374151',
                      cursor: 'pointer', fontFamily: FONT, fontSize: 12,
                      fontWeight: isSelected ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={22} />
                    <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─── Manual Form (shared by Manual, NLP confirm, Voice confirm, Scan confirm) ─── */
export function ManualForm({
  amount, setAmount, type, setType, category, setCategory,
  note, setNote, date, setDate, amountError, setAmountError,
  categoryError, setCategoryError, availableCategories,
  isSubmitting, onSave, onDiscard, confirmMode,
}: ManualFormProps) {
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [showSheet, setShowSheet] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const today = getTodayIST()

  const isExpense = type === 'expense'
  const amountValue = parseFloat(amount)
  const isSaveDisabled = isSubmitting || !amount || isNaN(amountValue) || amountValue <= 0
  // Amount color: neutral gray when 0/empty, rose for expense, teal for income
  const amountColor = (!amount || isNaN(amountValue) || amountValue <= 0)
    ? '#d4d4d4' // neutral-300
    : isExpense
      ? RED   // rose/red for expense
      : '#0d9488' // teal-600 for income
  // Toggle pill color: always reflect current type
  const activeColor = isExpense ? RED : GREEN

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: FONT }}>
      {/* Amount */}
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{
            fontSize: 56, fontWeight: 700,
            color: amountColor, lineHeight: 1,
            transition: 'color 0.2s',
          }}>
            ₹
          </span>
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, '')
              setAmount(val)
              if (val) setAmountError('')
            }}
            style={{
              fontSize: 56, fontWeight: 700,
              color: amountColor,
              background: 'transparent', border: 'none', outline: 'none',
              textAlign: 'center', width: '65%',
              fontFamily: FONT, lineHeight: 1,
              transition: 'color 0.2s',
            }}
          />
        </div>
        {amountError && (
          <p style={{ color: RED, fontSize: 13, marginTop: 6 }}>{amountError}</p>
        )}
      </div>

      {/* Type Toggle */}
      <div style={{
        display: 'flex', background: '#f3f4f6', borderRadius: 12, padding: 4,
        position: 'relative', overflow: 'hidden',
      }}>
        <motion.div
          layout
          style={{
            position: 'absolute', top: 4,
            left: type === 'expense' ? 4 : '50%',
            width: 'calc(50% - 4px)', height: 'calc(100% - 8px)',
            background: activeColor,
            borderRadius: 10,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              if (t !== type) { setType(t); setCategory(''); setAmount('') }
            }}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none',
              color: type === t ? '#fff' : '#6b7280',
              fontWeight: 600, fontSize: 15, cursor: 'pointer',
              position: 'relative', zIndex: 1, fontFamily: FONT,
              transition: 'color 0.2s', textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Category Chips + More+ */}
      <div>
        <div
          style={{
            display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 4,
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
            scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
          }}
          className="[&::-webkit-scrollbar]:hidden"
        >
          {availableCategories.map(cat => {
            const Icon = categoryIconMap[cat.name] || MoreHorizontal
            const selected = category === cat.name
            return (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.name); setCategoryError('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 20,
                  border: selected ? '1.5px solid #14b8a6' : '1.5px solid #e5e7eb',
                  background: selected ? '#f0fdfa' : '#fff',
                  color: selected ? '#0f766e' : '#525252',
                  fontSize: 13, fontWeight: selected ? 500 : 400,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all 0.15s', fontFamily: FONT,
                }}
              >
                <Icon size={16} />
                {cat.name}
              </button>
            )
          })}

          {/* More+ pill */}
          <button
            onClick={() => setShowSheet(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 20,
              border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#6b7280',
              fontSize: 13, fontWeight: 400,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              fontFamily: FONT,
            }}
          >
            More +
          </button>
        </div>
        {categoryError && (
          <p style={{ color: RED, fontSize: 13, marginTop: 8 }}>{categoryError}</p>
        )}
      </div>

      {/* Description (optional) */}
      <input
        placeholder="What was this for? (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{
          width: '100%', padding: '14px 16px',
          border: '1.5px solid #e5e7eb', borderRadius: 12,
          fontSize: 15, outline: 'none', fontFamily: FONT,
          transition: 'border-color 0.2s', boxSizing: 'border-box',
        }}
        onFocus={(e) => { e.target.style.borderColor = TEAL }}
        onBlur={(e) => { e.target.style.borderColor = '#e5e7eb' }}
      />

      {/* Date */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => dateInputRef.current?.showPicker?.()}
          style={{
            width: '100%', padding: '14px 16px',
            border: '1.5px solid #e5e7eb', borderRadius: 12,
            fontSize: 15, background: '#fff', color: '#374151',
            cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
          }}
        >
          {formatDateDisplay(date)}
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={date}
          max={today}
          onChange={(e) => {
            const safe = validateTransactionDate(e.target.value)
            setDate(safe)
          }}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%', opacity: 0, cursor: 'pointer',
          }}
        />
      </div>

      {/* Save Button */}
      <button
        onClick={onSave}
        disabled={isSaveDisabled}
        style={{
          width: '100%', padding: '16px',
          background: isSaveDisabled ? '#e5e5e5' : '#0d9488',
          color: isSaveDisabled ? '#a3a3a3' : '#fff',
          border: 'none', borderRadius: 14,
          fontSize: 16, fontWeight: 600,
          cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
          fontFamily: FONT,
          transition: 'all 0.2s',
          transform: (!isSaveDisabled && isPressed) ? 'scale(0.98)' : 'scale(1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
        onMouseDown={() => { if (!isSaveDisabled) setIsPressed(true) }}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => { if (!isSaveDisabled) setIsPressed(true) }}
        onTouchEnd={() => setIsPressed(false)}
      >
        {isSubmitting
          ? <>
              <span style={{
                display: 'inline-block', width: 16, height: 16, border: '2px solid #fff',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              Saving...
            </>
          : 'Save Transaction'
        }
      </button>

      {/* Discard (confirm mode only) */}
      {confirmMode && onDiscard && (
        <button
          onClick={onDiscard}
          style={{
            width: '100%', padding: '12px',
            background: 'transparent', color: '#6b7280',
            border: '1.5px solid #e5e7eb', borderRadius: 14,
            fontSize: 14, cursor: 'pointer', fontFamily: FONT,
          }}
        >
          Discard
        </button>
      )}

      {/* CSS for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Category sheet */}
      <CategorySheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        type={type}
        selected={category}
        onSelect={(name) => { setCategory(name); setCategoryError('') }}
      />
    </div>
  )
}

/* ─── Manual Tab ─── */
export default function ManualTab() {
  const { saveTransaction, isSubmitting, currentUser } = useTransaction()
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getTodayIST())
  const [amountError, setAmountError] = useState('')
  const [categoryError, setCategoryError] = useState('')

  const availableCategories = getCategoriesByType(type)

  const handleSave = () => {
    let valid = true
    setAmountError('')
    setCategoryError('')
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
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
      amount: parsed,
      type,
      category,
      note,
      date: validateTransactionDate(date),
    }])
  }

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
      onSave={handleSave}
    />
  )
}
