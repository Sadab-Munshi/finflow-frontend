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
  planName: string
  isPro: boolean
  loading: boolean
  onSignOut: () => void | Promise<void>
}

/**
 * Phone / tablet navigation. Built on Radix Dialog so focus trapping, Escape,
 * focus restore, `aria-modal` and background scroll locking come from a
 * dependency that is already installed, and it mirrors the desktop panel's
 * light surface exactly so the two never feel like different products.
 */
export default function MobileNavDrawer({
  open,
  onOpenChange,
  name,
  avatarUrl,
  planName,
  isPro,
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
              <Image
                src="/images/finflow-logo-tight.png"
                alt="FinFlow"
                width={97}
                height={30}
                sizes="140px"
                className="ff-logo"
                draggable={false}
              />
            </Link>
            <Dialog.Close asChild>
              <button type="button" className="ff-drawer-close" aria-label={t('closeNav')}>
                <X size={17} strokeWidth={2} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="ff-cta-wrap">
            <Link href="/add?tab=manual" className="ff-cta" onClick={() => onOpenChange(false)}>
              <Plus strokeWidth={2.1} aria-hidden="true" />
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
              planName={planName}
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
