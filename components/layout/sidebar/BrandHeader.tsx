'use client'

import { useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Tooltip } from 'radix-ui'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface BrandHeaderProps {
  isPro: boolean
  planName: string
  toggle: () => void
}

const mark = (isPro: boolean) => (
  <span className={cn('ff-mark', isPro && 'ff-mark--pro')}>
    <Image
      src="/images/finflow-mark.png"
      alt=""
      width={36}
      height={36}
      priority
      sizes="36px"
      className="h-9 w-9 select-none"
      draggable={false}
    />
  </span>
)

/**
 * Brand row. Both the expanded and the rail variant are always in the DOM and
 * CSS decides which one is visible (`[data-ff-sidebar]` on <html>). That keeps
 * the very first painted frame correct even before React hydrates, so a stored
 * "collapsed" preference never flashes an expanded panel.
 */
export default function BrandHeader({ isPro, planName, toggle }: BrandHeaderProps) {
  const t = useTranslations('nav')
  const wideToggleRef = useRef<HTMLButtonElement>(null)
  const railToggleRef = useRef<HTMLButtonElement>(null)

  const handleToggle = useCallback(() => {
    // Decide before mutating: after the toggle the opposite control is visible,
    // so keyboard focus follows it instead of being dropped onto <body>.
    const willCollapse = document.documentElement.getAttribute('data-ff-sidebar') !== 'collapsed'
    toggle()
    window.requestAnimationFrame(() => {
      const target = willCollapse ? railToggleRef.current : wideToggleRef.current
      target?.focus({ preventScroll: true })
    })
  }, [toggle])

  return (
    <div className="ff-head">
      <Link href="/dashboard" className="ff-brand-link" prefetch={false}>
        {mark(isPro)}
        <span className="ff-brand-text">
          <span className="ff-wordmark">FinFlow</span>
          {planName && (
            <span className="ff-subtitle">
              <span className="ff-subtitle-text">{planName}</span>
            </span>
          )}
        </span>
      </Link>

      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            ref={railToggleRef}
            type="button"
            onClick={handleToggle}
            className="ff-brand-rail"
            aria-label={t('expandNav')}
            aria-expanded={false}
            aria-controls="ff-sidebar-nav"
          >
            {mark(isPro)}
            <span className="ff-brand-rail-glyph" aria-hidden="true">
              <PanelLeftOpen size={15} strokeWidth={2} />
            </span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="right" sideOffset={12} collisionPadding={8} className="ff-tooltip">
            {t('expandNav')}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            ref={wideToggleRef}
            type="button"
            onClick={handleToggle}
            className="ff-toggle"
            aria-label={t('collapseNav')}
            aria-expanded
            aria-controls="ff-sidebar-nav"
          >
            <PanelLeftClose size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="bottom" sideOffset={8} collisionPadding={8} className="ff-tooltip">
            {t('collapseNav')}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </div>
  )
}
