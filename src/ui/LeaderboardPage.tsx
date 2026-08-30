import { useEffect, useState } from 'react'
import { navigate } from '../router'
import { Logo } from './Logo'
import { Avatar } from './Avatar'

interface LeaderboardRow {
  name: string
  resolvedCount: number
  avgResolutionMs: number | null
  totalHintsUsed: number
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—'
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 60) return `${totalMin}m`
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`
}

export function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setRows)
      .catch(() => setError("Couldn't load the leaderboard — try again in a bit."))
  }, [])

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[640px] px-6 py-14">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <button onClick={() => navigate('/')} className="font-mono text-[11px] hover:underline" style={{ color: 'var(--fg-faint)' }}>
            ← open incidents
          </button>
        </div>

        <h1 className="mb-1.5 text-[24px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
          Leaderboard
        </h1>
        <p className="mb-8 max-w-[56ch] text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          Ranked by incidents resolved, then by average time-to-resolution. Only accounts that have solved at least
          one incident show up here.
        </p>

        {error && (
          <div className="rounded-md px-4 py-3 font-mono text-[12.5px]" style={{ background: 'var(--crit-bg)', color: 'var(--crit)' }}>
            {error}
          </div>
        )}

        {!error && !rows && (
          <div className="font-mono text-[12.5px]" style={{ color: 'var(--fg-faint)' }}>
            Loading…
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className="rounded-md border p-5 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="font-mono text-[12.5px]" style={{ color: 'var(--fg-muted)' }}>
              Nobody's on the board yet. Sign in, resolve an incident, and be the first.
            </p>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {rows.map((r, i) => (
              <div
                key={r.name + i}
                className="flex items-center gap-3 rounded-md border px-4 py-3"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <span className="w-5 text-right font-mono text-[12px]" style={{ color: i < 3 ? 'var(--accent)' : 'var(--fg-faint)' }}>
                  {i + 1}
                </span>
                <Avatar name={r.name} />
                <span className="flex-1 truncate text-[13px] font-medium">{r.name}</span>
                <span className="font-mono text-[10.5px]" style={{ color: 'var(--fg-faint)' }}>
                  {r.totalHintsUsed} hint{r.totalHintsUsed === 1 ? '' : 's'}
                </span>
                <span className="font-mono text-[10.5px]" style={{ color: 'var(--fg-faint)' }}>
                  avg {fmtDuration(r.avgResolutionMs)}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold"
                  style={{ background: 'var(--ok-bg)', color: 'var(--ok)' }}
                >
                  {r.resolvedCount} resolved
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
