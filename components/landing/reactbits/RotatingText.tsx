'use client'

import React, { useEffect, useState } from 'react'

interface RotatingTextProps {
  items: string[]
  intervalMs?: number
  className?: string
}

/**
 * ReactBits-inspired RotatingText component.
 * Cycles smoothly through an array of phrases with a vertical slide + fade transition.
 */
export function RotatingText({
  items,
  intervalMs = 2800,
  className = '',
}: RotatingTextProps) {
  const [index, setIndex] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (items.length <= 1) return
    let intervalId: ReturnType<typeof setInterval> | null = null
    const startDelay = setTimeout(() => {
      intervalId = setInterval(() => {
        setAnimating(true)
        setTimeout(() => {
          setIndex((prev) => (prev + 1) % items.length)
          setAnimating(false)
        }, 220)
      }, intervalMs)
    }, 6000)

    return () => {
      clearTimeout(startDelay)
      if (intervalId) clearInterval(intervalId)
    }
  }, [items.length, intervalMs])

  return (
    <span
      className={`inline-flex items-center overflow-hidden align-bottom ${className}`}
      aria-live="polite"
    >
      <span
        style={{
          display: 'inline-block',
          transition: 'opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(-10px)' : 'translateY(0px)',
        }}
      >
        {items[index]}
      </span>
    </span>
  )
}
