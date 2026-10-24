'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronUp, LogOut, PenLine, User } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import AvatarCircle from './AvatarCircle'

interface AccountMenuProps {
  name: string
  avatarUrl: string
  isPro: boolean
  loading: boolean
  onSignOut: () => void | Promise<void>
  /**
   * `popup` is the desktop footer (avoids pushing the panel's height around).
   * `inline` is used inside the mobile drawer, where a nested popover would
   * fight the dialog's own Escape handling and can be clipped by the drawer's
   * scroll container — so the same actions are simply laid out in the flow.
   */
  variant?: 'popup' | 'inline'
}

export default function AccountMenu({
  name,
  avatarUrl,
  isPro,
  loading,
  onSignOut,
  variant = 'popup',
}: AccountMenuProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Navigating anywhere should dismiss the menu.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [open])

  // Escape closes the menu only. stopPropagation keeps the mobile drawer (which
  // also closes on Escape) open, because the menu lives inside it.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation()
        setOpen(false)
      }
    },
    [open]
  )

  const identity = loading ? (
    <>
      <span className="ff-profile-skeleton" aria-hidden="true" />
      <span className="ff-profile-skeleton ff-profile-skeleton--text" aria-hidden="true" />
    </>
  ) : (
    <AvatarCircle name={name} avatarUrl={avatarUrl} isPro={isPro} size={34} />
  )

  if (variant === 'inline') {
    return (
      <div className="ff-account ff-account--inline">
        <div className="ff-inline-user">
          {identity}
          {!loading && (
            <span className="ff-inline-identity">
              <span className="ff-inline-name">{name}</span>
              {isPro && <span className="ff-inline-pro">PRO</span>}
            </span>
          )}
        </div>
        <div className="ff-inline-actions">
          <Link href="/profile" className="ff-inline-action" onClick={() => setOpen(false)}>
            <PenLine size={16} strokeWidth={1.9} aria-hidden="true" />
            <span>{t('editProfile')}</span>
          </Link>
          <button type="button" className="ff-inline-action ff-inline-action--danger" onClick={() => void onSignOut()}>
            <LogOut size={16} strokeWidth={1.9} aria-hidden="true" />
            <span>{t('signOut')}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ff-account" ref={wrapRef} onKeyDown={handleKeyDown}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            className="ff-profile-pop"
            role="menu"
            aria-label={name || t('profile')}
          >
            <Link href="/profile" role="menuitem" className="ff-profile-pop-item" onClick={() => setOpen(false)}>
              <User size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>{t('viewProfile')}</span>
            </Link>
            <Link href="/profile" role="menuitem" className="ff-profile-pop-item" onClick={() => setOpen(false)}>
              <PenLine size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>{t('editProfile')}</span>
            </Link>
            <button
              type="button"
              role="menuitem"
              className="ff-profile-pop-item ff-profile-pop-item--danger"
              onClick={() => {
                setOpen(false)
                void onSignOut()
              }}
            >
              <LogOut size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>{t('signOut')}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={name || t('profile')}
        className="ff-profile"
      >
        {identity}
        {!loading && (
          <>
            <span className="ff-profile-name">
              <span className="ff-profile-name-text">{name}</span>
              {isPro && <span className="ff-profile-pro">PRO</span>}
            </span>
            <ChevronUp
              size={15}
              strokeWidth={2}
              aria-hidden="true"
              className={`ff-profile-caret${open ? ' is-open' : ''}`}
            />
          </>
        )}
      </button>
    </div>
  )
}
