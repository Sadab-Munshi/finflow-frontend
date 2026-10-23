import React from 'react'

interface BlurTextProps {
  text: string
  className?: string
  delayStepMs?: number
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
}

/**
 * Static instant text renderer with zero delayed entrance transitions.
 */
export function BlurText({
  text,
  className = '',
  as: Tag = 'span',
}: BlurTextProps) {
  return <Tag className={className}>{text}</Tag>
}
