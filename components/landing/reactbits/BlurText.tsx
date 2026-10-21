'use client'

import React from 'react'

interface BlurTextProps {
  text: string
  className?: string
  delayStepMs?: number
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
}

/**
 * ReactBits-inspired BlurText component.
 * Renders immediately visible text for fast SSR Largest Contentful Paint (LCP)
 * and valid ARIA semantics while applying a subtle upward word-stagger entrance.
 */
export function BlurText({
  text,
  className = '',
  delayStepMs = 35,
  as: Tag = 'span',
}: BlurTextProps) {
  const words = text.split(' ')

  return (
    <Tag className={className}>
      {words.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          style={{
            display: 'inline-block',
            animation: 'blurTextSlide 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
            animationDelay: `${idx * delayStepMs}ms`,
          }}
        >
          {word}
          {idx < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </Tag>
  )
}
