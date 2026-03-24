'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, X } from 'lucide-react'

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    setShowUpdate(false)
    window.location.reload()
  }, [registration])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        setRegistration(reg)

        // If a new worker is already waiting
        if (reg.waiting) {
          setShowUpdate(true)
        }

        // When a new worker is installed and waiting
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdate(true)
            }
          })
        })

        // When the controller changes (new SW activated), reload
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return
          refreshing = true
          window.location.reload()
        })

        // Check for updates when user returns to tab
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            reg.update()
          }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
      } catch (err) {
        console.error('SW registration failed:', err)
      }
    }

    registerSW()
  }, [])

  if (!showUpdate) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: 'linear-gradient(135deg, #0d9488, #0f766e)',
        color: '#fff',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}
    >
      <RefreshCw size={16} />
      <span>New version available!</span>
      <button
        onClick={applyUpdate}
        style={{
          background: '#fff',
          color: '#0d9488',
          border: 'none',
          borderRadius: '6px',
          padding: '4px 12px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Update Now
      </button>
      <button
        onClick={() => setShowUpdate(false)}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.8)',
          cursor: 'pointer',
          padding: '2px',
        }}
        aria-label="Dismiss update notification"
      >
        <X size={16} />
      </button>
    </div>
  )
}
