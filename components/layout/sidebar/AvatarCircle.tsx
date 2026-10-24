'use client'

import Image from 'next/image'

interface AvatarCircleProps {
  name?: string
  avatarUrl?: string
  size?: number
  className?: string
  /**
   * Comes from the real entitlement state (`isPro` in UserContext). Undefined or
   * false renders the neutral free-user treatment — the ring is never inferred
   * from the plan *name*, so a downgraded account loses it immediately.
   */
  isPro?: boolean
}

/** Champagne gold. The one accent the PRO treatment is allowed to add. */
export const PRO_RING_COLOR = '#C9A45C'

/**
 * Circular user avatar.
 *
 * Three decisions here are load-bearing:
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
 * 3. The PRO ring is an `outline`, not a border or a wraparound frame. A border
 *    would eat into the 32px box and crop the photo; a nested ring element
 *    would either be clipped by this box's `overflow: hidden` or sit *on* the
 *    image. `outline` + `outline-offset` paints a perfect circle outside the
 *    crop with a transparent gap, so it never touches the pixels and it looks
 *    right on both the #f8faf9 panel and the #ffffff drawer without knowing
 *    which surface it is on.
 */
export default function AvatarCircle({ name, avatarUrl, size = 32, className, isPro }: AvatarCircleProps) {
  const initial = name ? name.charAt(0).toUpperCase() : ''
  const box = { width: size, height: size }
  // 1.5px gold at a 2px gap: ~39px of visual footprint inside a 44px row.
  const ring = isPro
    ? { outline: `1.5px solid ${PRO_RING_COLOR}`, outlineOffset: '2px' }
    : { boxShadow: '0 0 0 1px rgba(229, 235, 233, 1)' }

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        ...box,
        ...ring,
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
