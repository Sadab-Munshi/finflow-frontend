'use client'

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertTriangle, Check, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailSuggestion {
  label: string
  onApply: () => void
}

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  icon: ReactNode
  error?: string
  action?: ReactNode
  isValid?: boolean
  helperText?: string
  suggestion?: EmailSuggestion | null
  containerClassName?: string
}

const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  {
    label,
    icon,
    error,
    action,
    isValid,
    helperText,
    suggestion,
    containerClassName,
    id,
    type = 'text',
    className,
    onKeyUp,
    onBlur,
    ...props
  },
  ref
) {
  const generatedId = useId()
  const inputId = id || generatedId
  const isPassword = type === 'password'
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)

  const helper = error
    ? { tone: 'error' as const, message: error }
    : capsLockOn && isPassword
      ? { tone: 'warning' as const, message: 'Caps Lock is on' }
      : suggestion
        ? { tone: 'hint' as const, message: `Did you mean ${suggestion.label}?` }
        : helperText
          ? { tone: 'hint' as const, message: helperText }
          : null

  return (
    <div className={cn('space-y-2', containerClassName)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
        {action}
      </div>

      <div
        className={cn(
          'group relative flex items-center rounded-2xl border bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-200 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100',
          error ? 'auth-shake border-rose-300 ring-4 ring-rose-100' : 'border-slate-200',
          className
        )}
      >
        <div className={cn('pointer-events-none absolute left-4 text-slate-400 transition-colors group-focus-within:text-teal-600', error && 'text-rose-500')}>
          {icon}
        </div>
        <input
          ref={ref}
          id={inputId}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={helper ? `${inputId}-helper` : undefined}
          onKeyUp={(event) => {
            if (isPassword) {
              setCapsLockOn(event.getModifierState('CapsLock'))
            }
            onKeyUp?.(event)
          }}
          onBlur={(event) => {
            if (isPassword) setCapsLockOn(false)
            onBlur?.(event)
          }}
          className="h-[52px] w-full rounded-2xl bg-transparent py-3 pl-11 pr-12 text-[15px] font-medium text-slate-950 outline-none placeholder:text-slate-400"
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : isValid && !error ? (
          <span className="absolute right-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-white shadow-sm">
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>

      <div
        id={`${inputId}-helper`}
        aria-live="polite"
        className={cn(
          'min-h-5 overflow-hidden text-xs transition-all duration-200',
          helper ? 'opacity-100' : 'opacity-0'
        )}
      >
        {helper && (
          <div
            className={cn(
              'flex items-center gap-1.5',
              helper.tone === 'error' && 'font-medium text-rose-600',
              helper.tone === 'warning' && 'font-medium text-amber-600',
              helper.tone === 'hint' && 'text-slate-500'
            )}
          >
            {helper.tone !== 'hint' && <AlertTriangle className="h-3.5 w-3.5" />}
            {suggestion && !error && helper.tone === 'hint' ? (
              <button
                type="button"
                onClick={suggestion.onApply}
                className="text-left font-semibold text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-800"
              >
                {helper.message}
              </button>
            ) : (
              <span>{helper.message}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default AuthField
