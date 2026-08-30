import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  durationMs?: number
  className?: string
  format?: (v: number) => string
}

const DEFAULT_FORMAT = (v: number) => Math.round(v).toLocaleString()

export function AnimatedCounter({ value, durationMs = 800, className, format = DEFAULT_FORMAT }: Props) {
  const [display, setDisplay] = useState(value)
  const previous = useRef(value)

  useEffect(() => {
    const from = previous.current
    const to = value
    if (from === to) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else previous.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  return <span className={className}>{format(display)}</span>
}