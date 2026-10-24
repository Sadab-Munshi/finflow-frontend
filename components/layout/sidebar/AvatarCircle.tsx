'use client'

import Image from 'next/image'

interface AvatarCircleProps {
  name?: string
  avatarUrl?: string
  size?: number
  className?: string
}

/**
 * Circular user avatar.
 *
 * Two decisions here are load-bearing:
 *
 * 1. The element that clips the photo carries BOTH `overflow: hidden` and
 *    `position: relative`/`absolute` itself. `next/image` renders with an
 *    inline `position: absolute`, so when the rounded box is `position: static`
 *    the image's containing block becomes the nearest *positioned* ancestor —
 *    an un-rounded wrapper — and the photo escapes the circular clip and paints
 *    as a square. Keeping the rounded, clipping box positioned is what makes
 *    the crop actually circular.
 * 2. `object-fit: cover` + centred `object-position` (set inline, so no class
 *    purge/override can drop it) means any aspect ratio fills the circle
 *    instead of being letterboxed.
 */
export default function AvatarCircle({ name, avatarUrl, size = 32, className }: AvatarCircleProps) {
  const initial = name ? name.charAt(0).toUpperCase() : ''
  const box = { width: size, height: size }

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        ...box,
        position: 'relative',
        display: 'block',
        flex: '0 0 auto',
        borderRadius: '9999px',
        overflow: 'hidden',
        backgroundColor: '#0d9488',
      }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          sizes={`${size}px`}
          className="h-full w-full rounded-full"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            borderRadius: '9999px',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      ) : (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            borderRadius: '9999px',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: Math.round(size * 0.4),
            lineHeight: 1,
          }}
        >
          {initial}
        </span>
      )}
    </span>
  )
}
