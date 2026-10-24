'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Dialog } from 'radix-ui'
import { Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import AccountMenu from './AccountMenu'
import SidebarNavList from './SidebarNavList'
import { SIDEBAR_ACCOUNT_NAV, SIDEBAR_PRIMARY_NAV } from './sidebar-nav'

interface MobileNavDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  avatarUrl: string
  isPro: boolean
  planName: string
  loading: boolean
  onSignOut: () => void | Promise<void>
}

/**
 * Phone / tablet navigation. Built on Radix Dialog so focus trapping, Escape,
 * focus restore, `aria-modal`, and background scroll locking come from an
 * already-installed dependency instead of hand-rolled listeners.
 */
export default function MobileNavDrawer({
  open,
  onOpenChange,
  name,
  avatarUrl,
  isPro,
  planName,
  loading,
  onSignOut,
}: MobileNavDrawerProps) {
  const t = useTranslations('nav')

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ff-drawer-overlay no-print" />
        <Dialog.Content
          className="ff-drawer no-print"
          aria-describedby={undefined}
          onCloseAutoFocus={event => {
            // The drawer is mounted from the shell rather than a Dialog.Trigger,
            // so focus is returned to the menu button explicitly.
            const trigger = document.querySelector<HTMLElement>('.ff-menu-trigger')
            if (!trigger) return
            event.preventDefault()
            trigger.focus({ preventScroll: true })
          }}
        >
          <Dialog.Title className="sr-only">{t('primaryNav')}</Dialog.Title>

          <div className="ff-drawer-head">
            <Link href="/dashboard" className="ff-drawer-brand" onClick={() => onOpenChange(false)}>
              <span className="ff-mark ff-mark--sm">
                <Image
                  src="/images/finflow-mark.png"
                  alt=""
                  width={32}
                  height={32}
                  sizes="32px"
                  className="h-8 w-8 select-none"
                  draggable={false}
                />
              </span>
              <span className="ff-drawer-brand-text">
                <span className="ff-wordmark">FinFlow</span>
                {planName && (
                  <span className="ff-subtitle">
                    <span className="ff-subtitle-text">{planName}</span>
                  </span>
                )}
              </span>
            </Link>
            <Dialog.Close asChild>
              <button type="button" className="ff-drawer-close" aria-label={t('closeNav')}>
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="ff-cta-wrap">
            <Link href="/add?tab=manual" className="ff-cta" onClick={() => onOpenChange(false)}>
              <Plus size={18} strokeWidth={2.1} aria-hidden="true" />
              <span className="ff-cta-label">{t('add')}</span>
            </Link>
          </div>

          <nav id="ff-drawer-nav" className="ff-nav" aria-label={t('primaryNav')}>
            <p className="ff-section-label">{t('sectionMain')}</p>
            <SidebarNavList items={SIDEBAR_PRIMARY_NAV} onNavigate={() => onOpenChange(false)} />
            <p className="ff-section-label">{t('sectionAccount')}</p>
            <SidebarNavList items={SIDEBAR_ACCOUNT_NAV} onNavigate={() => onOpenChange(false)} />
          </nav>

          <div className="ff-foot">
            <AccountMenu
              variant="inline"
              name={name}
              avatarUrl={avatarUrl}
              isPro={isPro}
              loading={loading}
              onSignOut={onSignOut}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
