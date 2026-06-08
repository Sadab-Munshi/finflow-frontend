'use client'

import { motion } from 'framer-motion'
import { Sparkles, Tag, Calendar, FileText, Pencil, Check, AlertTriangle } from 'lucide-react'
import { MoreHorizontal } from 'lucide-react'
import { TEAL, RED, FONT, categoryIconMap, formatDateDisplay, getTodayIST, resolveCategory, ParsedTransaction } from '../constants'

interface PreviewCardProps {
  parsed: ParsedTransaction
  onEdit: () => void
  onConfirm: () => void
  onDiscard: () => void
  isSubmitting: boolean
  confirmLabel?: string
  headerIcon?: React.ReactNode
  headerText?: string
}

export function PreviewCard({
  parsed, onEdit, onConfirm, onDiscard, isSubmitting,
  confirmLabel = 'Confirm Save',
  headerIcon,
  headerText = 'AI understood this as:',
}: PreviewCardProps) {
  // Fix 1a: normalize confidence — if value is between 0 and 1, multiply by 100
  const rawConfidence = parsed.confidence ?? 0.9
  const confidence = rawConfidence > 0 && rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence)
  const confidenceColor = confidence >= 90 ? TEAL : confidence >= 70 ? '#f97316' : RED
  const filledBars = Math.round((confidence / 100) * 10)
  const Icon = categoryIconMap[parsed.category] || categoryIconMap[resolveCategory(parsed.category)] || MoreHorizontal
  const displayCategory = resolveCategory(parsed.category)
  const displayDate = parsed.date ? formatDateDisplay(parsed.date) : formatDateDisplay(getTodayIST())

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      style={{
        background: '#fff', borderRadius: 20, padding: 24,
        border: `1.5px solid ${TEAL}30`,
        boxShadow: `0 0 24px ${TEAL}18, 0 4px 24px rgba(0,0,0,0.06)`,
        fontFamily: FONT, position: 'relative',
      }}
    >
      {/* Header + Edit icon (top-right) — Fix 1c */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {headerIcon || <Sparkles size={18} color={TEAL} />}
          <span style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{headerText}</span>
        </div>
        <button
          onClick={onEdit}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: '#f3f4f6', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
          title="Edit"
        >
          <Pencil size={15} color="#6b7280" />
        </button>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{
          fontSize: 42, fontWeight: 700,
          color: parsed.type === 'expense' ? RED : TEAL,
          lineHeight: 1,
        }}>
          ₹{Number(parsed.amount).toLocaleString('en-IN')}
        </span>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {/* Category + Type */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={16} color="#6b7280" />
            <Icon size={16} />
            <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{displayCategory}</span>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
            background: parsed.type === 'expense' ? `${RED}15` : `${TEAL}15`,
            color: parsed.type === 'expense' ? RED : TEAL,
            textTransform: 'capitalize',
          }}>
            {parsed.type}
          </span>
        </div>

        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} color="#6b7280" />
          <span style={{ fontSize: 14, color: '#374151' }}>{displayDate}</span>
        </div>

        {/* Description */}
        {(parsed.note || parsed.description) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="#6b7280" />
            <span style={{ fontSize: 14, color: '#374151' }}>{parsed.note || parsed.description}</span>
          </div>
        )}
      </div>

      {/* Confidence Bar */}
      <div style={{
        padding: '14px 16px', background: '#f9fafb', borderRadius: 12, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>AI Confidence</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: confidenceColor }}>{confidence}%</span>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 6, borderRadius: 3,
                background: i < filledBars ? confidenceColor : '#e5e7eb',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
        {confidence < 70 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <AlertTriangle size={14} color={RED} />
            <span style={{ fontSize: 12, color: RED, fontWeight: 500 }}>Please verify details</span>
          </div>
        )}
      </div>

      {/* Action Buttons — Fix 1b: Confirm & Discard on the same line */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onDiscard}
          style={{
            flex: 1, padding: '14px 0',
            background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14,
            fontSize: 15, fontWeight: 600, color: '#6b7280',
            cursor: 'pointer', fontFamily: FONT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          Discard
        </button>
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          style={{
            flex: 2, padding: '14px 0',
            background: isSubmitting ? '#d1d5db' : TEAL,
            border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 600, color: '#fff',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontFamily: FONT,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Check size={16} /> {confirmLabel}
        </button>
      </div>
    </motion.div>
  )
}
