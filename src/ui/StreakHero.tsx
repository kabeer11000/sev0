import type { StreakState } from '../streak'

interface Props {
  streak: StreakState
}

function FlameIcon({ animated }: { animated: boolean }) {
  // layered flame — outer halo + inner core; both flicker-scaled
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      className={animated ? 'flame-flicker' : undefined}
      aria-hidden
    >
      <defs>
        <radialGradient id="flame-halo" cx="50%" cy="62%" r="55%">
          <stop offset="0%" stopColor="#f6c46b" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#ee5a36" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ee5a36" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="flame-core" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ee5a36" />
          <stop offset="55%" stopColor="#f3a14e" />
          <stop offset="100%" stopColor="#fbd58b" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="26" r="20" fill="url(#flame-halo)" />
      <path
        d="M22 6 C 18 12 14 14 14 21 C 14 28 18 34 22 36 C 26 34 30 28 30 21 C 30 16 28 14 26 12 C 25 14 24 15 22 14 C 23 10 24 8 22 6 Z"
        fill="url(#flame-core)"
        stroke="#c4552f"
        strokeWidth="0.8"
      />
    </svg>
  )
}

export function StreakHero({ streak }: Props) {
  const active = streak.count >= 1
  const warm = streak.count >= 3

  const headline = !active
    ? 'Start a streak today'
    : streak.count === 1
      ? '1-day streak — keep it going'
      : `${streak.count}-day streak`

  const subhead = !active
    ? 'Solve one incident a day to build a streak.'
    : streak.count === streak.best && streak.count >= 2
      ? 'New personal best!'
      : `Best: ${streak.best} day${streak.best === 1 ? '' : 's'}`

  return (
    <div
      className="mb-5 flex items-center gap-4 rounded-3xl px-5 py-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: warm
          ? 'linear-gradient(135deg, #fff1e1 0%, #ffe1cc 100%)'
          : active
            ? 'linear-gradient(135deg, #fff5ec 0%, var(--bg-elevated) 80%)'
            : 'var(--surface)',
        border: warm ? '1px solid #f3c89b' : '1px solid var(--border)',
        boxShadow: warm ? '0 1px 2px rgba(196, 85, 47, 0.06), 0 8px 24px rgba(238, 90, 54, 0.10)' : 'var(--shadow-card)',
      }}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center">
        <FlameIcon animated={active} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[16px] font-semibold" style={{ letterSpacing: '-0.005em', color: 'var(--fg)' }}>
          {headline}
        </span>
        <span className="text-[12.5px]" style={{ color: 'var(--fg-muted)' }}>
          {subhead}
        </span>
      </div>
      {active && (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-mono text-[18px] font-bold"
          style={{ background: 'var(--accent)', color: '#fff' }}
          aria-label={`${streak.count} day streak`}
        >
          {streak.count}
        </div>
      )}
    </div>
  )
}
