'use client'

import { useEffect, useRef } from 'react'

interface TurnstileWidgetProps {
  siteKey?: string
  onSuccess?: (token: string) => void
  onError?: () => void
  onExpire?: () => void
}

declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, options: object) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onTurnstileLoad: () => void
  }
}

export default function TurnstileWidget({ 
  siteKey, 
  onSuccess, 
  onError,
  onExpire 
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const renderedRef = useRef(false)
  
  // Store callbacks in refs to avoid re-renders
  const callbacksRef = useRef({ onSuccess, onError, onExpire })
  callbacksRef.current = { onSuccess, onError, onExpire }

  useEffect(() => {
    // Prevent double render in React StrictMode
    if (renderedRef.current || widgetIdRef.current) return
    renderedRef.current = true

    const renderWidget = () => {
      if (!containerRef.current || widgetIdRef.current) return
      
      const key = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
      if (!key) {
        console.error('Turnstile: No site key provided')
        return
      }
      
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: key,
        theme: 'dark',
        callback: (token: string) => {
          callbacksRef.current.onSuccess?.(token)
        },
        'error-callback': () => {
          callbacksRef.current.onError?.()
        },
        'expired-callback': () => {
          callbacksRef.current.onExpire?.()
        },
      })
    }

    const SCRIPT_ID = 'cf-turnstile-script'

    if (window.turnstile) {
      renderWidget()
    } else if (!document.getElementById(SCRIPT_ID)) {
      window.onTurnstileLoad = renderWidget
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    } else {
      // Script exists but turnstile not loaded yet
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval)
          renderWidget()
        }
      }, 100)
      
      // Cleanup interval after 10 seconds to prevent infinite polling
      setTimeout(() => clearInterval(interval), 10000)
    }

    return () => {
      // Only cleanup on component unmount, not re-renders
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = null
      }
      renderedRef.current = false
    }
    // Empty dependency array - only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="mt-2" />
}
