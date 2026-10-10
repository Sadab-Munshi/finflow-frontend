'use client'

import { forwardRef } from 'react'
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile'

interface TurnstileWidgetProps {
  siteKey?: string
  theme?: 'light' | 'dark' | 'auto'
  className?: string
  /** Render nothing and only challenge when `execute()` is called (on submit). */
  invisible?: boolean
  onSuccess?: (token: string) => void
  onError?: () => void
  onExpire?: () => void
}

const TurnstileWidget = forwardRef<TurnstileInstance, TurnstileWidgetProps>(
  function TurnstileWidget({ siteKey, theme = 'dark', className = 'mt-2', invisible = false, onSuccess, onError, onExpire }, ref) {
    const key = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

    return (
      <Turnstile
        ref={ref}
        siteKey={key}
        options={invisible
          ? { theme, size: 'invisible', execution: 'execute' }
          : { theme }}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
        className={className}
      />
    )
  }
)

export default TurnstileWidget
export type { TurnstileInstance }
