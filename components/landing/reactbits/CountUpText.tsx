'use client'

import React, { useEffect, useRef, useState } from 'react'

interface CountUpTextProps {
  end: number
  prefix?: string
  suffix?: string
  durationMs?: number
  className?: string
  indianFormat?: boolean
}

/**
 * ReactBits-inspired CountUp component with Indian Rupee (en-IN) number formatting and tabular-nums.
 */
export function CountUpText({
  end,
  prefix = '',
  suffix = '',
  durationMs = 1100,
  className = '',
  indianFormat = true,
}: CountUpTextProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [value, setValue] = useState(end)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || hasAnimated) return

    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true)
          const startTime = performance.now()
          const step = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(1, elapsed / durationMs)
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(Math.round(end * eased))
            if (progress < 1) {
              requestAnimationFrame(step)
            } else {
              setValue(end)
            }
          }
          requestAnimationFrame(step)
          observer.disconnect()
        }
      },
      { threshold: 0.25 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [end, durationMs, hasAnimated])

  const formatted = indianFormat
    ? value.toLocaleString('en-IN')
    : String(value)

  return (
    <span
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
