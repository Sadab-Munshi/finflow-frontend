'use client'

import { useEffect, useState } from 'react'
import { X, Share } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useLanguage } from '@/context/LanguageContext'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', 
  '/reset-password', '/privacy', '/terms', '/disclaimer', '/support']

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
}

export default function InstallPrompt() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [isIOSDevice, setIsIOSDevice] = useState(false)

  useEffect(() => {
    // Don't show on public pages
    if (PUBLIC_ROUTES.includes(pathname)) return

    // Don't show if already installed
    if (isInStandaloneMode()) return

    // Don't show if dismissed this session
    try {
      if (sessionStorage.getItem('install-dismissed') === 'true') return
    } catch {}

    const ios = isIOS()
    setIsIOSDevice(ios)

    if (ios) {
      // iOS doesn't support beforeinstallprompt, show manual instructions
      setTimeout(() => setShow(true), 2000)
    } else {
      // Android/Chrome
      const handler = (e: any) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setShow(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [pathname])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    try { sessionStorage.setItem('install-dismissed', 'true') } catch {}
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      left: '16px',
      right: '16px',
      zIndex: 9999,
      background: '#ffffff',
      borderRadius: '14px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      border: '1px solid #e5e7eb',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      <Image
        src="/icons/icon-72x72.png"
        alt="FinFlow"
        width={44}
        height={44}
        style={{ borderRadius: '10px', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
          {t('installFinFlowApp')}
        </p>
        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isIOSDevice
            ? t('tapShareAddToHome')
            : t('addToHomeQuickAccess')}
        </p>
      </div>
      {isIOSDevice ? (
        <Share size={20} color="#0d9488" style={{ flexShrink: 0 }} />
      ) : (
        <button
          onClick={handleInstall}
          style={{
            background: '#0d9488', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
            fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}
        >
          {t('installBtn')}
        </button>
      )}
      <button
        onClick={handleDismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af', flexShrink: 0 }}
      >
        <X size={18} />
      </button>
    </div>
  )
}
