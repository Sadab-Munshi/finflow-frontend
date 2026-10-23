import React from 'react'

interface RotatingTextProps {
  items: string[]
  intervalMs?: number
  className?: string
}

/**
 * Static instant text renderer (timed transitions disabled).
 */
export function RotatingText({
  items,
  className = '',
}: RotatingTextProps) {
  return <span className={className}>{items[0] ?? ''}</span>
}
