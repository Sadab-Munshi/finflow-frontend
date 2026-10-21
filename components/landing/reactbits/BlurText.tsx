'use client'

import React, { useEffect, useRef, useState } from 'react'

interface BlurTextProps {
  text: string
  className?: string
  delayStepMs?: number
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
}

/**
 * ReactBits-inspired BlurText component.
 * Animates each word from a subtle blur + upward offset into crisp focus when entering the viewport.
 */
export function BlurText({
  text,
  className = '',
  delayStepMs = 45,
  as: Tag = 'span',
}: BlurTextProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const words = text.split(' ')

  return (
    <Tag
      ref={ref as any}
      className={className}
      aria-label={text}
    >
      {words.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          aria-hidden="true"
          style={{
            display: 'inline-block',
            transitionProperty: 'opacity, transform, filter',
            transitionDuration: '620ms',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: `${idx * delayStepMs}ms`,
            opacity: visible ? 1 : 0.01,
            transform: visible ? 'translateY(0px)' : 'translateY(14px)',
            filter: visible ? 'blur(0px)' : 'blur(7px)',
            willChange: 'transform, opacity, filter',
          }}
        >
          {word}
          {idx < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </Tag>
  )
}
