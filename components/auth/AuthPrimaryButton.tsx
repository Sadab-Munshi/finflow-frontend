'use client'

import type { ButtonHTMLAttributes } from 'react'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type SubmitStatus = 'idle' | 'loading' | 'success'

interface AuthPrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  status?: SubmitStatus
  idleLabel: string
  loadingLabel?: string
  successLabel?: string
}

export default function AuthPrimaryButton({
  status = 'idle',
  idleLabel,
  loadingLabel = 'Just a second…',
  successLabel = 'Done',
  className,
  disabled,
  ...props
}: AuthPrimaryButtonProps) {
  const isLoading = status === 'loading'
  const isSuccess = status === 'success'

  return (
    <button
      disabled={disabled || isLoading || isSuccess}
      className={cn(
        'group relative flex w-full items-center justify-center overflow-hidden rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60',
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-white/20 opacity-0 transition-all duration-700 group-hover:left-[125%] group-hover:opacity-100" />
      {isLoading ? (
        <span className="relative flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </span>
      ) : isSuccess ? (
        <span className="relative flex items-center gap-2">
          <span className="auth-success-pop inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-400 text-slate-950">
            <Check className="h-3.5 w-3.5" />
          </span>
          {successLabel}
        </span>
      ) : (
        <span className="relative flex items-center gap-2">
          {idleLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      )}
    </button>
  )
}
