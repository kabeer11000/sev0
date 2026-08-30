import { useSev0Store } from '../store'
import { getSolveMeta } from '../progress'

function fmtBest(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function PracticeStats() {
  const scenario = useSev0Store((s) => s.scenario)
  const meta = getSolveMeta(scenario)
  if (!meta?.bestResolutionMs) return null

  return (
    <div
      className="flex h-8 items-center gap-1.5 rounded-full px-3"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      title="Your personal best for this incident"
    >
      <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-faint)', letterSpacing: '0.06em' }}>
        Best
      </span>
      <span className="font-mono text-[12.5px] font-bold tabular-nums" style={{ color: 'var(--ok)' }}>
        {fmtBest(meta.bestResolutionMs)}
      </span>
    </div>
  )
}
