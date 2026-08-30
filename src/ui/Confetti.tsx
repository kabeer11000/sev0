import { useState } from 'react'

const COLORS = ['#e26d44', '#3d8a5a', '#c98715', '#5b9aff', '#9d6dff', '#d96a8a', '#2fa99d']

interface Piece {
  id: number
  left: number
  color: string
  dx: number
  dy: number
  rot: number
  delay: number
  duration: number
  size: number
}

function generatePieces(count: number, durationMs: number): Piece[] {
  return Array.from({ length: count }, (_, i) => {
    const dy = 220 + Math.random() * 360
    const dx = (Math.random() - 0.5) * 280
    const rot = (Math.random() - 0.5) * 1080
    return {
      id: i,
      left: Math.random() * 100,
      color: COLORS[i % COLORS.length] ?? '#e26d44',
      dx,
      dy,
      rot,
      delay: Math.random() * 200,
      duration: durationMs + Math.random() * 600,
      size: 6 + Math.random() * 6,
    }
  })
}

interface Props {
  count?: number
  durationMs?: number
}

export function Confetti({ count = 80, durationMs = 2200 }: Props) {
  // lazy useState initializer — Math.random runs once at mount, not on every render
  const [pieces] = useState(() => generatePieces(count, durationMs))

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute block"
          style={{
            top: -16,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            borderRadius: 2,
            opacity: 0,
            // CSS custom props consumed by the keyframe
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            ['--rot' as string]: `${p.rot}deg`,
            animation: `confetti-fall ${p.duration}ms cubic-bezier(0.22, 0.61, 0.36, 1) ${p.delay}ms forwards`,
          }}
        />
      ))}
    </div>
  )
}
