'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  /**
   * Opens the shared sign-out confirmation. It must never sign the user out on
   * its own — the desktop panel only owns the *trigger*, the dialog owns the
   * request — and the mobile drawer no longer renders it at all.
   */
  onSignOut?: () => void | Promise<void>
  /**
   * `popup` is the desktop footer. `inline` is the mobile drawer's account
   * block: identity only, laid out in the flow, with no actions. Sign out and
   * edit profile deliberately stay on the desktop menu and the Profile screen
   * so the drawer bottom never turns into a second settings page.
   */
  variant?: 'popup' | 'inline'
  /**
   * Render the popup in a portal anchored to the trigger instead of inside the
   * panel. The 68px rail cannot contain a 208px menu, so once the panel carries
   * `contain: paint` that menu has to live outside it or it would be clipped
   * back to the rail. The expanded panel keeps the simple in-flow popup.
   */
  portalled?: boolean
}

export default function AccountMenu({
  name,
  avatarUrl,
  planName,
  isPro,
  loading,
  onSignOut,
  variant = 'popup',
  portalled = false,
}: AccountMenuProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  // Anchor for the portalled variant, measured once when the menu opens. The
  // shell is viewport-locked and the panel never moves relative to it, so this
  // needs no scroll listener — only a width change can invalidate it.
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null)

  // Navigating anywhere dismisses the menu.
  useEffect(() => {
    setOpen(false)
    setAnchor(null)
  }, [pathname])

  useEffect(() => {
    if (!open || !portalled) return
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    // Anchor to the panel's right edge, not the trigger's: the trigger is a
    // 40px avatar centred inside a 68px rail, so using its right edge would
    // leave the menu tucked 6px onto the panel. The menu reads as attached to
    // the rail, not to the circle.
    const panel = el.closest('.ff-sidebar')?.getBoundingClientRect()
    setAnchor({
      left: Math.round((panel?.right ?? rect.right) + 8),
      bottom: Math.round(window.innerHeight - rect.bottom),
    })

    // A width change re-lays-out the rail and invalidates the anchor, so the
    // menu closes rather than tracking it. Height-only churn is ignored, the
    // same rule the shell uses.
    let lastWidth = window.innerWidth
    const onResize = () => {
      if (window.innerWidth === lastWidth) return
      lastWidth = window.innerWidth
      setOpen(false)
      setAnchor(null)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, portalled])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      const inTrigger = wrapRef.current?.contains(target)
      const inPopup = popRef.current?.contains(target)
      if (!inTrigger && !inPopup) {
        setOpen(false)
        setAnchor(null)
      }
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

  if (variant === 'inline') {
    return (
      <div className="ff-account ff-account--inline">
        <div className="ff-inline-user">
          {loading ? (
            <>
              <span className="ff-profile-skeleton" aria-hidden="true" />
              <span className="ff-profile-skeleton ff-profile-skeleton--text" aria-hidden="true" />
            </>
          ) : (
            <>
              <AvatarCircle name={name} avatarUrl={avatarUrl} size={32} isPro={isPro} />
              <span className="ff-inline-identity">
                <span className="ff-inline-name-row">
                  <span className="ff-inline-name">{name}</span>
                  {isPro && <span className="ff-pro-chip">{t('proBadge')}</span>}
                </span>
                {planName && (
                  <span className={`ff-inline-plan${isPro ? ' ff-inline-plan--pro' : ''}`}>{planName}</span>
                )}
              </span>
            </>
          )}
        </div>
      </div>
    )
  }

  const menuItems = (
    <>
      <Link href="/profile" prefetch={false} role="menuitem" className="ff-profile-pop-item" onClick={() => setOpen(false)}>
        <User size={15} strokeWidth={1.9} aria-hidden="true" />
        <span>{t('viewProfile')}</span>
      </Link>
      <Link href="/profile" prefetch={false} role="menuitem" className="ff-profile-pop-item" onClick={() => setOpen(false)}>
        <PenLine size={15} strokeWidth={1.9} aria-hidden="true" />
        <span>{t('editProfile')}</span>
      </Link>
      <button
        type="button"
        role="menuitem"
        className="ff-profile-pop-item ff-profile-pop-item--danger"
        onClick={() => {
          // Close the menu first so the confirmation is the only surface holding
          // focus, then hand off — never sign out from here.
          setOpen(false)
          void onSignOut?.()
        }}
      >
        <LogOut size={15} strokeWidth={1.9} aria-hidden="true" />
        <span>{t('signOut')}</span>
      </button>
    </>
  )

  return (
    <div className="ff-account" ref={wrapRef} onKeyDown={handleKeyDown}>
      {portalled ? (
        // Portalled variant: the panel carries `contain: paint`, so a 208px menu
        // anchored outside a 68px rail has to render into <body> or it would be
        // clipped. Mounted/unmounted rather than AnimatePresence-driven so the
        // element it tracks is always the motion node itself.
        open && anchor
          ? createPortal(
              <motion.div
                ref={popRef}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                className="ff-profile-pop ff-profile-pop--floating"
                role="menu"
                aria-label={name || t('profile')}
                style={{ left: anchor.left, bottom: anchor.bottom }}
              >
                {menuItems}
              </motion.div>,
              document.body
            )
          : null
      ) : (
        <AnimatePresence>
          {open && (
            <motion.div
              ref={popRef}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
              className="ff-profile-pop"
              role="menu"
              aria-label={name || t('profile')}
            >
              {menuItems}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <button
        ref={triggerRef}
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
            <AvatarCircle name={name} avatarUrl={avatarUrl} size={32} isPro={isPro} />
            <span className="ff-profile-name">
              <span className="ff-profile-name-row">
                <span className="ff-profile-name-text">{name}</span>
                {isPro && <span className="ff-pro-chip">{t('proBadge')}</span>}
              </span>
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
