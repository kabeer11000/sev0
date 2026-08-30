import type { LastResolution } from '../store'
import { BadgeIcon } from './BadgeIcon'
import { BADGES } from '../badges'
import { AnimatedCounter } from './AnimatedCounter'
import { SparkleIcon } from './SparkleIcon'

function FlameIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 44 44" className="flame-flicker" aria-hidden>
      <defs>
        <linearGradient id="res-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ee5a36" />
          <stop offset="55%" stopColor="#f3a14e" />
          <stop offset="100%" stopColor="#fbd58b" />
        </linearGradient>
      </defs>
      <path
        d="M22 6 C 18 12 14 14 14 21 C 14 28 18 34 22 36 C 26 34 30 28 30 21 C 30 16 28 14 26 12 C 25 14 24 15 22 14 C 23 10 24 8 22 6 Z"
        fill="url(#res-flame)"
        stroke="#c4552f"
        strokeWidth="0.8"
      />
    </svg>
  )
}

export function ResolutionCelebration({ resolution }: { resolution: LastResolution }) {
  return (
    <div
      className="pop-in mb-4 overflow-hidden rounded-3xl border"
      style={{
        background: 'linear-gradient(135deg, #fff5ec 0%, var(--ok-bg) 100%)',
        borderColor: 'var(--ok)',
        boxShadow: '0 8px 24px rgba(61, 138, 90, 0.12)',
      }}
    >
      <div className="flex items-center gap-3 px-5 pt-5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--ok)', color: '#fff' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12 L 10 17 L 19 7" />
          </svg>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[10.5px] font-semibold uppercase" style={{ color: 'var(--ok)', letterSpacing: '0.08em' }}>
            Incident resolved
          </span>
          <span className="text-[16px] font-semibold" style={{ color: 'var(--fg)', letterSpacing: '-0.005em' }}>
            On-call is calmer.
          </span>
        </div>
        {resolution.streakCount >= 1 && (
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(255,255,255,0.7)' }}>
            <FlameIcon />
            <span className="font-mono text-[12px] font-bold" style={{ color: 'var(--accent-strong)' }}>
              {resolution.streakCount}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        <div className="flex flex-col rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.65)' }}>
          <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--fg-faint)', letterSpacing: '0.06em' }}>
            XP earned
          </span>
          <span className="font-mono text-[18px] font-bold" style={{ color: 'var(--accent-strong)' }}>
            +<AnimatedCounter value={resolution.xp} durationMs={900} />
          </span>
        </div>
        <div className="flex flex-col rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.65)' }}>
          <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--fg-faint)', letterSpacing: '0.06em' }}>
            Time
          </span>
          <span className="font-mono text-[18px] font-bold" style={{ color: 'var(--fg)' }}>
            {fmtTime(resolution.resolutionMs)}
          </span>
        </div>
      </div>

      {resolution.leveledUp && (
        <div
          className="mx-5 mb-4 flex items-center gap-2 rounded-2xl px-3 py-2.5"
          style={{ background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-vivid) 100%)', color: '#fff' }}
        >
          <SparkleIcon size={16} className="sparkle-spin" />
          <span className="text-[12.5px] font-semibold">
            Level up — {resolution.levelBefore} → {resolution.levelAfter}
          </span>
        </div>
      )}

      {resolution.badges.length > 0 && (
        <div className="px-5 pb-5">
          <div className="mb-2 text-[10px] font-semibold uppercase" style={{ color: 'var(--fg-faint)', letterSpacing: '0.06em' }}>
            Badges earned
          </div>
          <div className="flex flex-wrap gap-2">
            {resolution.badges.map((id) => {
              const meta = BADGES.find((b) => b.id === id)
              return (
                <div
                  key={id}
                  className="flex items-center gap-1.5 rounded-full pl-1 pr-3"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid var(--accent-dim)' }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'var(--accent-dim)', color: 'var(--accent-strong)' }}>
                    <BadgeIcon id={id} size={14} />
                  </span>
                  <span className="text-[11.5px] font-medium" style={{ color: 'var(--fg)' }}>
                    {meta?.label ?? id}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {resolution.newBest && !resolution.leveledUp && resolution.badges.length === 0 && (
        <div className="mx-5 mb-5 flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--ok)' }}>
          <SparkleIcon size={14} />
          New personal best
        </div>
      )}
    </div>
  )
}

function fmtTime(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
