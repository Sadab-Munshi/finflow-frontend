'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { DM_Sans } from 'next/font/google'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })

const SLIDES = [
  { src: '/screen-dashboard.png', alt: 'Dashboard screen' },
  { src: '/screen-history.png',   alt: 'History screen'   },
  { src: '/screen-insights.png',  alt: 'Insights screen'  },
  { src: '/screen-budgets.png',   alt: 'Budgets screen'   },
]

const INTERVAL_MS = 3000

export default function PhoneSlider() {
  const [current, setCurrent]           = useState(0)
  const [offset, setOffset]             = useState(0)   // 0 = visible, -100 = slide out left
  const [nextIndex, setNextIndex]       = useState<number | null>(null)
  const [nextOffset, setNextOffset]     = useState(100) // incoming slide starts from right
  const [animating, setAnimating]       = useState(false)
  const [arrowLeft, setArrowLeft]       = useState(false)
  const [arrowRight, setArrowRight]     = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = useCallback((index: number) => {
    if (animating) return
    const next = (index + SLIDES.length) % SLIDES.length
    if (next === current) return

    setAnimating(true)
    setNextIndex(next)
    setNextOffset(100)     // new slide enters from right

    // Trigger the transition on next paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOffset(-100)    // current slides out left
        setNextOffset(0)   // next slides in to center

        setTimeout(() => {
          setCurrent(next)
          setOffset(0)
          setNextIndex(null)
          setNextOffset(100)
          setAnimating(false)
        }, 420)
      })
    })
  }, [animating, current])

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(next, INTERVAL_MS)
  }, [next])

  // Auto-slide
  useEffect(() => {
    timerRef.current = setInterval(next, INTERVAL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [next])

  const handleArrow = useCallback((dir: 'prev' | 'next') => {
    if (dir === 'prev') prev(); else next()
    resetTimer()
  }, [prev, next, resetTimer])

  const handleDot = useCallback((i: number) => {
    goTo(i)
    resetTimer()
  }, [goTo, resetTimer])

  return (
    <section
      style={{
        width: '100%',
        background: '#ffffff',
        padding: '3rem 1rem 2.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      className={dmSans.className}
    >
      {/* Slide row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          width: '100%',
          maxWidth: '500px',
        }}
      >
        {/* Left arrow */}
        <button
          onClick={() => handleArrow('prev')}
          aria-label="Previous screen"
          onMouseEnter={() => setArrowLeft(true)}
          onMouseLeave={() => setArrowLeft(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.5rem',
            color: '#555',
            padding: '0.75rem',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: arrowLeft ? 1 : 0.4,
            transition: 'opacity 0.25s ease',
            flexShrink: 0,
          }}
        >
          ←
        </button>

        {/* Phone frame */}
        <div
          style={{
            position: 'relative',
            width: 'clamp(220px, 30vw, 280px)',
            flexShrink: 0,
            animation: 'phoneBob 3s ease-in-out infinite',
            filter: 'drop-shadow(0 24px 32px rgba(0,184,148,0.35))',
          }}
        >
          {/* Keyframe animation */}
          <style>{`
            @keyframes phoneBob {
              0%, 100% { transform: translateY(0px); }
              50%       { transform: translateY(-10px); }
            }
          `}</style>

          {/* Slide viewport */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '9/19',
              overflow: 'hidden',
              borderRadius: '16px',
            }}
          >
            {/* Current slide */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: `translateX(${offset}%)`,
                transition: animating ? 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' : 'none',
              }}
            >
              <Image
                src={SLIDES[current].src}
                alt={SLIDES[current].alt}
                fill
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>

            {/* Incoming slide */}
            {nextIndex !== null && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: `translateX(${nextOffset}%)`,
                  transition: animating ? 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' : 'none',
                }}
              >
                <Image
                  src={SLIDES[nextIndex].src}
                  alt={SLIDES[nextIndex].alt}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right arrow */}
        <button
          onClick={() => handleArrow('next')}
          aria-label="Next screen"
          onMouseEnter={() => setArrowRight(true)}
          onMouseLeave={() => setArrowRight(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.5rem',
            color: '#555',
            padding: '0.75rem',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: arrowRight ? 1 : 0.4,
            transition: 'opacity 0.25s ease',
            flexShrink: 0,
          }}
        >
          →
        </button>
      </div>

      {/* Dot indicators */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          marginTop: '1.25rem',
        }}
      >
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDot(i)}
            aria-label={`Go to screen ${i + 1}`}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span
              style={{
                width: i === current ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === current ? '#00b894' : '#d1d5db',
                display: 'block',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          </button>
        ))}
      </div>
    </section>
  )
}
