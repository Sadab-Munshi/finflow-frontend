'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, Search, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import NotificationBell from '@/components/notifications/NotificationBell'
import AvatarCircle from '@/components/layout/sidebar/AvatarCircle'

interface AppTopBarProps {
  onOpenMenu: () => void
  menuOpen: boolean
  name: string
  avatarUrl: string
  isPro: boolean
  loading: boolean
}

/**
 * Global utility header.
 *
 * It lives inside the scrolling canvas rather than floating over it, which is
 * what separates global controls from page-level ones: the notification bell
 * can no longer sit on top of a page's own toolbar (it used to overlap the
 * dashboard's "This Month / All Time" pill at every width).
 *
 * One bar, two densities:
 * - < 900px: menu + notifications, both rendered through the shared
 *   `.ff-icon-btn` so the hamburger and the bell are identical in size, radius,
 *   background, border and hover — the pair reads as one control group.
 * - ≥ 900px: transaction search on the left, then settings, notifications and
 *   the account avatar on the right. The sidebar keeps the full navigation and
 *   the account menu; this bar only surfaces top-level shortcuts.
 */
export default function AppTopBar({
  onOpenMenu,
  menuOpen,
  name,
  avatarUrl,
  isPro,
  loading,
}: AppTopBarProps) {
  const t = useTranslations('nav')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)

  // ── Floating-control visibility (phones only) ───────────────────────────
  //
  // The controls slide out on downward scroll and back on upward scroll. The
  // scroll handler never calls setState directly: it accumulates a delta and
  // only crosses into React when a threshold is passed, so a fast flick costs
  // two renders (hide, then show) instead of one per frame.
  const headerRef = useRef<HTMLElement>(null)
  const hiddenRef = useRef(false)
  const [hidden, setHidden] = useState(false)

  const commitHidden = useCallback((next: boolean) => {
    if (hiddenRef.current === next) return
    hiddenRef.current = next
    setHidden(next)
  }, [])

  // An open drawer or notification panel, or focus inside the header, pins the
  // controls on screen — otherwise the very panel they opened could slide away
  // from the button that owns it.
  useEffect(() => {
    if (menuOpen || notifOpen) commitHidden(false)
  }, [menuOpen, notifOpen, commitHidden])

  useEffect(() => {
    const header = headerRef.current
    // The app has exactly one scroll container; find it from the header so this
    // component stays independent of how the shell wires its ref.
    const canvas = header?.closest('.ff-canvas') as HTMLElement | null
    if (!header || !canvas) return

    const HIDE_AFTER = 50
    const SHOW_AFTER = 12
    let lastY = canvas.scrollTop
    let accumulated = 0
    let frame = 0

    const evaluate = () => {
      frame = 0
      // Desktop keeps the sticky bar; never hide it, and clear any stale flag
      // left over from a resize across the breakpoint.
      if (!window.matchMedia('(max-width: 899px)').matches) {
        commitHidden(false)
        return
      }

      // Clamp both ends. iOS reports negative scrollTop while rubber-banding
      // and past-maximum values at the bottom; without this the overscroll
      // bounce registers as a huge downward delta and flickers the controls.
      const maxY = Math.max(0, canvas.scrollHeight - canvas.clientHeight)
      const y = Math.min(Math.max(0, canvas.scrollTop), maxY)
      const dy = y - lastY
      if (dy === 0) return

      // Any direction change starts the counter over, so a small reversal can
      // reveal the controls immediately instead of first undoing the downward
      // distance that hid them.
      if ((dy > 0 && accumulated < 0) || (dy < 0 && accumulated > 0)) accumulated = 0
      accumulated += dy
      lastY = y

      if (y === 0) {
        accumulated = 0
        commitHidden(false)
      } else if (accumulated > HIDE_AFTER) {
        commitHidden(true)
      } else if (accumulated < -SHOW_AFTER) {
        commitHidden(false)
      }
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(evaluate)
    }

    canvas.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      canvas.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [commitHidden])

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    // History already filters by text; routing the query to it keeps search
    // real instead of inventing a result surface behind a decorative input.
    router.push(q ? `/history?q=${encodeURIComponent(q)}` : '/history')
  }

  return (
    <header
      ref={headerRef}
      className={`ff-topbar no-print${hidden ? ' ff-topbar--hidden' : ''}`}
      // Reaching either control by keyboard reveals the pair before the focus
      // ring paints, so a hidden header can never hold invisible focus.
      onFocusCapture={() => commitHidden(false)}
    >
      <div className="ff-topbar-side">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={t('openNav')}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="ff-icon-btn ff-menu-trigger"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <form role="search" onSubmit={submitSearch} className="ff-search">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchTransactions')}
            enterKeyHint="search"
          />
        </form>
      </div>

      <div className="ff-topbar-side ff-topbar-side--end">
        <Link href="/settings" prefetch={false} className="ff-icon-btn ff-topbar-settings" aria-label={t('settings')}>
          <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
        </Link>

        <NotificationBell onPanelChange={setNotifOpen} />

        <Link
          href="/profile"
          prefetch={false}
          aria-label={t('profile')}
          className="ff-topbar-avatar"
        >
          {loading ? (
            <span className="ff-profile-skeleton" aria-hidden="true" />
          ) : (
            <AvatarCircle name={name} avatarUrl={avatarUrl} size={30} isPro={isPro} />
          )}
        </Link>
      </div>
    </header>
  )
}
