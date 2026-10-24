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
  planName: string
  isPro: boolean
  loading: boolean
  onSignOut: () => void | Promise<void>
  /**
   * `popup` is the desktop footer. `inline` is used inside the mobile drawer,
   * where actions are laid out in the flow instead of a nested popover — that
   * keeps them reachable while the drawer scrolls and avoids fighting the
   * dialog's own Escape handling.
   */
  variant?: 'popup' | 'inline'
}

export default function AccountMenu({
  name,
  avatarUrl,
  planName,
  isPro,
  loading,
  onSignOut,
  variant = 'popup',
}: AccountMenuProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Navigating anywhere dismisses the menu.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const inlineMenu = (
      <div className="ff-account ff-account--inline">
        <div className="ff-inline-user">
          {loading ? (
            <>
              <span className="ff-profile-skeleton" aria-hidden="true" />
              <span className="ff-profile-skeleton ff-profile-skeleton--text" aria-hidden="true" />
            </>
          ) : (
            <>
              <AvatarCircle name={name} avatarUrl={avatarUrl} size={32} />
              <span className="ff-inline-identity">
                <span className="ff-inline-name">{name}</span>
                {planName && (
                  <span className={`ff-inline-plan${isPro ? ' ff-inline-plan--pro' : ''}`}>{planName}</span>
                )}
              </span>
            </>
          )}
        </div>
        <div className="ff-inline-actions">
          <Link href="/profile" className="ff-inline-action">
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

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation()
        setOpen(false)
      }
    },
    [open]
  )

  if (variant === 'inline') return inlineMenu

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
        aria-label={name ? `${name} — account menu` : t('profile')}
        className="ff-profile"
      >
        {loading ? (
          <>
            <span className="ff-profile-skeleton" aria-hidden="true" />
            <span className="ff-profile-skeleton ff-profile-skeleton--text" aria-hidden="true" />
          </>
        ) : (
          <>
            <AvatarCircle name={name} avatarUrl={avatarUrl} size={32} />
            <span className="ff-profile-name">
              <span className="ff-profile-name-text">{name}</span>
              {planName && (
                <span className={`ff-profile-plan${isPro ? ' ff-profile-plan--pro' : ''}`}>{planName}</span>
              )}
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
