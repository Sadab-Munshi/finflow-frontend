'use client'

import { useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Tooltip } from 'radix-ui'
import { useTranslations } from 'next-intl'

interface BrandHeaderProps {
  toggle: () => void
}

/**
 * Brand row.
 *
 * The expanded state uses the real FinFlow lockup (`finflow-logo-tight.png`,
 * the shipped 2000×632 artwork with only its transparent padding trimmed) at a
 * fixed height with `width: auto`, so the artwork keeps its native 3.23:1 ratio
 * and is never stretched, squashed or redrawn. The rail state swaps to the
 * emblem-only mark cut from that same file — no new artwork, no decorative
 * circle behind it.
 *
 * Both variants stay in the DOM; CSS picks one from `[data-ff-sidebar]`, so the
 * first painted frame is already correct before hydration.
 */
export default function BrandHeader({ toggle }: BrandHeaderProps) {
  const t = useTranslations('nav')
  const wideToggleRef = useRef<HTMLButtonElement>(null)
  const railToggleRef = useRef<HTMLButtonElement>(null)

  const handleToggle = useCallback(() => {
    // Decide before mutating: the opposite control becomes visible, so keyboard
    // focus has to follow it instead of being dropped onto <body>.
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
        <Image
          src="/images/finflow-logo-tight.png"
          alt="FinFlow"
          width={97}
          height={30}
          priority
          sizes="140px"
          className="ff-logo"
          draggable={false}
        />
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
            <Image
              src="/images/finflow-mark.png"
              alt=""
              width={60}
              height={60}
              priority
              sizes="30px"
              className="ff-mark"
              draggable={false}
            />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="right" sideOffset={10} collisionPadding={8} className="ff-tooltip">
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
            <PanelLeftClose size={17} strokeWidth={1.9} aria-hidden="true" />
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
