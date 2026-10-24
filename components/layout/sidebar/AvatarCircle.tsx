'use client'

import Image from 'next/image'
import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AvatarCircleProps {
  name?: string
  avatarUrl?: string
  isPro?: boolean
  size?: number
  className?: string
}

/**
 * Shared profile avatar. Preserves the existing FinFlow treatment: teal
 * gradient, uploaded photo when available, and the amber Pro crown badge.
 */
export default function AvatarCircle({
  name,
  avatarUrl,
  isPro = false,
  size = 36,
  className,
}: AvatarCircleProps) {
  const initial = name ? name.charAt(0).toUpperCase() : ''

  return (
    <span className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <span
        className={cn(
          'flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-teal-500 to-teal-600',
          isPro && 'ring-2 ring-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.55)]',
          className
        )}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
        ) : (
          <span className="font-bold text-white" style={{ fontSize: size * 0.36 }}>
            {initial}
          </span>
        )}
      </span>
      {isPro && (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#082F2D] bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-sm"
        >
          <Crown className="h-2.5 w-2.5 fill-slate-950 text-slate-950" />
        </span>
      )}
    </span>
  )
}
