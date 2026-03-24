'use client'

import { forwardRef } from 'react'
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile'

interface TurnstileWidgetProps {
  siteKey?: string
  onSuccess?: (token: string) => void
  onError?: () => void
  onExpire?: () => void
}

const TurnstileWidget = forwardRef<TurnstileInstance, TurnstileWidgetProps>(
  function TurnstileWidget({ siteKey, onSuccess, onError, onExpire }, ref) {
    const key = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

    return (
      <Turnstile
        ref={ref}
        siteKey={key}
        options={{ theme: 'dark' }}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
        className="mt-2"
      />
    )
  }
)

export default TurnstileWidget
export type { TurnstileInstance }
