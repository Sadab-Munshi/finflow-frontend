'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { DM_Sans } from 'next/font/google'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })

const SLIDES = [
  {
    src: '/screen-dashboard.png',
    alt: 'FinFlow Dashboard screen showing ₹2,58,750 balance',
    label: '01 · Live Dashboard',
    caption: 'Real-time net cashflow, savings rate, and recent rupee transactions at a glance.',
  },
  {
    src: '/screen-history.png',
    alt: 'FinFlow Transaction History screen',
    label: '02 · Ledger History',
    caption: 'Every voice, photo, and Telegram entry organized with instant search and category filters.',
  },
  {
    src: '/screen-insights.png',
    alt: 'FinFlow AI Insights screen',
    label: '03 · AI Insights',
    caption: 'Actionable spending intelligence that spots recurring leaks before month-end.',
  },
  {
    src: '/screen-budgets.png',
    alt: 'FinFlow Budgets screen',
    label: '04 · Smart Budgets',
    caption: 'Category guardrails with proactive pacing alerts at 80% utilization.',
  },
]

const INTERVAL_MS = 3600

export default function PhoneSlider() {
  const [current, setCurrent] = useState(0)
  const [offset, setOffset] = useState(0)
  const [nextIndex, setNextIndex] = useState<number | null>(null)
  const [nextOffset, setNextOffset] = useState(100)
  const [animating, setAnimating] = useState(false)
  const [arrowLeft, setArrowLeft] = useState(false)
  const [arrowRight, setArrowRight] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = useCallback(
    (index: number) => {
      if (animating) return
      const next = (index + SLIDES.length) % SLIDES.length
      if (next === current) return

      setAnimating(true)
      setNextIndex(next)
      setNextOffset(100)

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOffset(-100)
          setNextOffset(0)

          setTimeout(() => {
            setCurrent(next)
            setOffset(0)
            setNextIndex(null)
            setNextOffset(100)
            setAnimating(false)
          }, 420)
        })
      })
    },
    [animating, current]
  )

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(next, INTERVAL_MS)
  }, [next])

  useEffect(() => {
    timerRef.current = setInterval(next, INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [next])

  const handleArrow = useCallback(
    (dir: 'prev' | 'next') => {
      if (dir === 'prev') prev()
      else next()
      resetTimer()
    },
    [prev, next, resetTimer]
  )

  const handleDot = useCallback(
    (i: number) => {
      goTo(i)
      resetTimer()
    },
    [goTo, resetTimer]
  )

  return (
    <div
      style={{
        width: '100%',
        background: 'transparent',
        padding: '1rem 0.5rem 0.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      className={dmSans.className}
    >
      {/* Interactive Screen Selector Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {SLIDES.map((slide, idx) => {
          const isActive = idx === current
          return (
            <button
              key={slide.src}
              type="button"
              onClick={() => handleDot(idx)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono tracking-wide transition-all cursor-pointer ${
                isActive
                  ? 'bg-teal-500 text-zinc-950 font-semibold shadow-sm'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 hover:text-white border border-zinc-700/70'
              }`}
            >
              {slide.label}
            </button>
          )
        })}
      </div>

      {/* Slide row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
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
          className="rounded-full border border-zinc-700/80 bg-zinc-900/80 text-zinc-200 hover:border-teal-400 hover:text-teal-300"
          style={{
            cursor: 'pointer',
            fontSize: '1.15rem',
            padding: '0.65rem',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: arrowLeft ? 1 : 0.75,
            transition: 'all 0.25s ease',
            flexShrink: 0,
          }}
        >
          ←
        </button>

        {/* Phone frame */}
        <div
          style={{
            position: 'relative',
            width: 'clamp(220px, 28vw, 276px)',
            flexShrink: 0,
            animation: 'phoneBob 3.5s ease-in-out infinite',
            filter: 'drop-shadow(0 24px 36px rgba(13, 148, 136, 0.28))',
          }}
        >
          <style>{`
            @keyframes phoneBob {
              0%, 100% { transform: translateY(0px); }
              50%       { transform: translateY(-8px); }
            }
          `}</style>

          {/* Slide viewport */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '9/19',
              overflow: 'hidden',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.14)',
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
                sizes="280px"
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
                  sizes="280px"
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
          className="rounded-full border border-zinc-700/80 bg-zinc-900/80 text-zinc-200 hover:border-teal-400 hover:text-teal-300"
          style={{
            cursor: 'pointer',
            fontSize: '1.15rem',
            padding: '0.65rem',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: arrowRight ? 1 : 0.75,
            transition: 'all 0.25s ease',
            flexShrink: 0,
          }}
        >
          →
        </button>
      </div>

      {/* Active slide caption */}
      <p className="mt-4 text-xs sm:text-sm text-zinc-300 text-center max-w-md px-3 min-h-[2.5rem]">
        {SLIDES[current].caption}
      </p>

      {/* Dot indicators */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          marginTop: '0.5rem',
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
                width: i === current ? '22px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === current ? '#14b8a6' : '#52525b',
                display: 'block',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
