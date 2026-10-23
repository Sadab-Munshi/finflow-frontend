import React from 'react'

interface CountUpTextProps {
  end: number
  prefix?: string
  suffix?: string
  durationMs?: number
  className?: string
  indianFormat?: boolean
}

/**
 * Static instant number formatter with tabular numerals.
 */
export function CountUpText({
  end,
  prefix = '',
  suffix = '',
  className = '',
  indianFormat = true,
}: CountUpTextProps) {
  const formatted = indianFormat
    ? end.toLocaleString('en-IN')
    : String(end)

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
