'use client'

import React from 'react'
import { CheckCircle2, Clock, XCircle, AlertCircle, RotateCcw } from 'lucide-react'
import { normalizePaymentStatus, type CanonicalPaymentStatus } from '@/lib/subscription-utils'

interface PaymentStatusBadgeProps {
  status: string | null | undefined
  size?: 'sm' | 'md'
  className?: string
}

const TONE_STYLES: Record<
  CanonicalPaymentStatus,
  {
    bg: string
    text: string
    border: string
    Icon: React.ComponentType<{ className?: string }>
  }
> = {
  paid: {
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#047857]',
    border: 'border-[#A7F3D0]',
    Icon: CheckCircle2,
  },
  pending: {
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#B45309]',
    border: 'border-[#FDE68A]',
    Icon: Clock,
  },
  failed: {
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    border: 'border-[#FECACA]',
    Icon: XCircle,
  },
  expired: {
    bg: 'bg-[#F1F5F9]',
    text: 'text-[#475569]',
    border: 'border-[#CBD5E1]',
    Icon: AlertCircle,
  },
  refunded: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1D4ED8]',
    border: 'border-[#BFDBFE]',
    Icon: RotateCcw,
  },
}

export function PaymentStatusBadge({
  status,
  size = 'sm',
  className = '',
}: PaymentStatusBadgeProps) {
  const normalized = normalizePaymentStatus(status)
  const style = TONE_STYLES[normalized.status]
  const Icon = style.Icon

  return (
    <span
      role="status"
      aria-label={`Payment status: ${normalized.label}`}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs'
      } ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
      <span>{normalized.label}</span>
    </span>
  )
}
