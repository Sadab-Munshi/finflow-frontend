'use client'

import { useRef, useState } from 'react'

interface BorderGlowProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
  borderRadius?: string
}

export function BorderGlow({
  children,
  className = '',
  glowColor = 'teal',
  borderRadius = '16px',
}: BorderGlowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const glowColorMap: Record<string, string> = {
    teal: 'rgba(13,148,136,0.5)',
    blue: 'rgba(59,130,246,0.5)',
    purple: 'rgba(168,85,247,0.5)',
  }

  const color = glowColorMap[glowColor] || glowColorMap.teal

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{ borderRadius }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow border */}
      <div
        className="absolute -inset-px transition-opacity duration-300 pointer-events-none"
        style={{
          borderRadius,
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(300px circle at ${position.x}px ${position.y}px, ${color}, transparent 60%)`,
        }}
      />
      {/* Outer border */}
      <div
        className="absolute inset-0 rounded-[inherit] border border-neutral-200 pointer-events-none"
        style={{ borderRadius }}
      />
      {/* Content */}
      <div className="relative" style={{ borderRadius }}>
        {children}
      </div>
    </div>
  )
}
