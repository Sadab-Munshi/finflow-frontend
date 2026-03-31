'use client'

import { useRef, useEffect, useState, useMemo } from 'react'

interface AntigravityProps {
  children: React.ReactNode
  className?: string
}

export function Antigravity({ children, className = '' }: AntigravityProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const delay = useMemo(() => `${Math.random() * 0.5}s`, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      <style jsx global>{`
        @keyframes antigravity-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      <div
        style={{
          animation: isVisible ? 'antigravity-float 4s ease-in-out infinite' : 'none',
          animationDelay: delay,
        }}
      >
        {children}
      </div>
    </div>
  )
}
