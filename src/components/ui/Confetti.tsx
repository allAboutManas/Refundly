import { useEffect, useState } from 'react'

const COLORS = ['#6355F6', '#16a34a', '#f59e0b', '#0ea5e9', '#e2464b', '#7b72ff']
const PIECES = 42

/** Subtle one-shot confetti burst. Auto-removes after the animation. */
export function Confetti({ duration = 2200 }: { duration?: number }) {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const t = window.setTimeout(() => setShow(false), duration)
    return () => window.clearTimeout(t)
  }, [duration])

  if (show === false) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {Array.from({ length: PIECES }, (_, i) => {
        const left = (i * 97) % 100
        const delay = (i % 10) * 90
        const dur = 1500 + (i % 7) * 160
        const size = 6 + (i % 4) * 2
        const color = COLORS[i % COLORS.length]
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: '-5vh',
              left: `${left}%`,
              width: size,
              height: size * 1.6,
              background: color,
              borderRadius: 2,
              animation: `rr-confetti-fall ${dur}ms ${delay}ms cubic-bezier(0.2, 0.6, 0.4, 1) forwards`,
            }}
          />
        )
      })}
    </div>
  )
}
