'use client'

import { useState } from 'react'
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

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    // History already filters by text; routing the query to it keeps search
    // real instead of inventing a result surface behind a decorative input.
    router.push(q ? `/history?q=${encodeURIComponent(q)}` : '/history')
  }

  return (
    <header className="ff-topbar no-print">
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
        <Link href="/settings" className="ff-icon-btn ff-topbar-settings" aria-label={t('settings')}>
          <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
        </Link>

        <NotificationBell />

        <Link
          href="/profile"
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
