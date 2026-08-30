import { useEffect, useState } from 'react'
import { loadProgress } from '../progress'
import { levelProgress } from '../levels'
import { readStreak } from '../streak'

function FlameIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3 C 9 7 7 9 7 13 a5 5 0 0 0 10 0 C 17 9 15 7 12 3 Z" />
      <path d="M10 14 c 0 2 1 3 2 3 s 2 -1 2 -3" fill="rgba(0,0,0,0.18)" />
    </svg>
  )
}

export function HeaderProgress() {
  const [progress, setProgress] = useState(() => loadProgress())
  const [streak, setStreak] = useState(() => readStreak())

  useEffect(() => {
    const refresh = () => {
      setProgress(loadProgress())
      setStreak(readStreak())
    }
    const id = setInterval(refresh, 1500)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const lvl = levelProgress(progress.totalXp)
  const pct = Math.round(lvl.pct * 100)

  return (
    <div
      id="xp-target"
      className="flex h-8 items-center gap-2 rounded-full px-3"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      title={`${progress.totalXp.toLocaleString()} XP · ${lvl.current.title}${lvl.next ? ` → ${lvl.next.title}` : ''}`}
    >
      <div className="flex items-center gap-1">
        {streak.count >= 1 && (
          <span
            className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold font-mono"
            style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}
            title={`${streak.count}-day streak`}
          >
            <FlameIcon /> {streak.count}
          </span>
        )}
        <span className="text-[11.5px] font-semibold" style={{ color: 'var(--fg)' }}>
          {lvl.current.title}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="relative h-1.5 w-20 overflow-hidden rounded-full"
          style={{ background: 'var(--border)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: 'var(--accent)' }}
          />
        </div>
        <span className="font-mono text-[10.5px] tabular-nums" style={{ color: 'var(--fg-faint)' }}>
          {progress.totalXp.toLocaleString()} XP
        </span>
        {lvl.next && (
          <span className="font-mono text-[10px]" style={{ color: 'var(--fg-faint)' }}>
            · {lvl.next.minXp - progress.totalXp} to {lvl.next.title}
          </span>
        )}
      </div>
    </div>
  )
}
