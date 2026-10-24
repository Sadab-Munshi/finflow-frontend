'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Tooltip } from 'radix-ui'
import { cn } from '@/lib/utils'
import { isNavActive, type SidebarNavItem } from './sidebar-nav'

interface SidebarNavListProps {
  items: SidebarNavItem[]
  onNavigate?: () => void
  /**
   * Wrap each row in a portalled tooltip. Only enabled while the desktop rail
   * is collapsed — in the expanded panel the label is already visible.
   */
  tooltips?: boolean
}

export default function SidebarNavList({ items, onNavigate, tooltips = false }: SidebarNavListProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  return (
    <>
      {items.map(item => {
        const active = isNavActive(pathname, item.path)
        const label = t(item.labelKey)

        const row = (
          <Link
            href={item.path}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn('ff-nav-row', active && 'ff-nav-row--active')}
          >
            <span className="ff-nav-bar" aria-hidden="true" />
            <item.icon className="ff-nav-icon" size={20} strokeWidth={1.9} aria-hidden="true" />
            <span className="ff-nav-label">{label}</span>
          </Link>
        )

        return (
          <Fragment key={item.path}>
            {tooltips ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>{row}</Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side="right" sideOffset={12} collisionPadding={8} className="ff-tooltip">
                    {label}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : (
              row
            )}
          </Fragment>
        )
      })}
    </>
  )
}
