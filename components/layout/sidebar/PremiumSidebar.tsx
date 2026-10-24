'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Tooltip } from 'radix-ui'
import { useTranslations } from 'next-intl'
import AccountMenu from './AccountMenu'
import BrandHeader from './BrandHeader'
import SidebarNavList from './SidebarNavList'
import { SIDEBAR_ACCOUNT_NAV, SIDEBAR_PRIMARY_NAV } from './sidebar-nav'
import { useSidebarRail } from './useSidebarRail'

interface PremiumSidebarProps {
  name: string
  avatarUrl: string
  isPro: boolean
  planName: string
  loading: boolean
  onSignOut: () => void | Promise<void>
}

/**
 * Desktop navigation: a 272px labelled panel that compresses into a 72px icon
 * rail. Width, padding, label opacity and every collapsed-state rule live in
 * globals.css behind `[data-ff-sidebar]`, so the transition is one class flip
 * instead of a React re-render of the whole shell.
 */
export default function PremiumSidebar({
  name,
  avatarUrl,
  isPro,
  planName,
  loading,
  onSignOut,
}: PremiumSidebarProps) {
  const t = useTranslations('nav')
  const { collapsed, toggle } = useSidebarRail()

  const addLink = (
    <Link href="/add?tab=manual" className="ff-cta">
      <Plus size={18} strokeWidth={2.1} aria-hidden="true" />
      <span className="ff-cta-label">{t('add')}</span>
    </Link>
  )

  return (
    <Tooltip.Provider delayDuration={180} skipDelayDuration={250}>
      <aside className="ff-sidebar no-print">
        <BrandHeader isPro={isPro} planName={planName} toggle={toggle} />

        <div className="ff-cta-wrap">
          {collapsed ? (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>{addLink}</Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side="right" sideOffset={12} collisionPadding={8} className="ff-tooltip">
                  {t('add')}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ) : (
            addLink
          )}
        </div>

        <nav id="ff-sidebar-nav" className="ff-nav" aria-label={t('primaryNav')}>
          <p className="ff-section-label">{t('sectionMain')}</p>
          <SidebarNavList items={SIDEBAR_PRIMARY_NAV} tooltips={collapsed} />
          <p className="ff-section-label">{t('sectionAccount')}</p>
          <SidebarNavList items={SIDEBAR_ACCOUNT_NAV} tooltips={collapsed} />
        </nav>

        <div className="ff-foot">
          <AccountMenu
            name={name}
            avatarUrl={avatarUrl}
            isPro={isPro}
            loading={loading}
            onSignOut={onSignOut}
          />
        </div>
      </aside>
    </Tooltip.Provider>
  )
}
