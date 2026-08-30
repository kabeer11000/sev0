import { useEffect, useState } from 'react'
import { useSev0Store } from '../store'

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function ElapsedTimer() {
  const scenario = useSev0Store((s) => s.scenario)
  const taskStartedAt = useSev0Store((s) => s.taskStartedAt)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const remaining = scenario.timeLimitMs - (now - taskStartedAt)
  const overtime = remaining < 0

  return (
    <span
      title={overtime ? 'Over the time budget for this incident' : 'Time remaining in the budget for this incident'}
      className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums"
      style={{ color: overtime ? 'var(--crit)' : 'var(--fg-faint)' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: overtime ? 'var(--crit)' : 'var(--ok)' }} />
      {overtime ? '+' : ''}
      {formatClock(remaining)}
    </span>
  )
}
