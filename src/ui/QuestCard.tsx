import { useEffect, useState } from 'react'
import { getTodayQuest, timeUntilNextQuest } from '../quests'

function ScrollIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6 a2 2 0 0 0-2 2 v16 a2 2 0 0 0 2 2 h12 a2 2 0 0 0 2-2 V8 z" />
      <path d="M14 2 v6 h6" />
      <path d="M9 13 l2 2 l4-4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12 L 10 17 L 19 7" />
    </svg>
  )
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function QuestCard() {
  const [quest, setQuest] = useState(() => getTodayQuest())
  // ticking state forces a re-render every second so the countdown updates
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1)
      const next = getTodayQuest()
      setQuest((prev) => (prev.date === next.date ? prev : next))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const completed = quest.completedAt !== undefined
  const t = timeUntilNextQuest()

  return (
    <div
      className="mb-5 rounded-3xl border p-5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: completed
          ? 'linear-gradient(135deg, #fff5ec 0%, var(--ok-bg) 100%)'
          : 'linear-gradient(135deg, var(--accent-dim) 0%, var(--bg-elevated) 80%)',
        borderColor: completed ? 'var(--ok)' : 'var(--accent-dim)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            background: completed ? 'var(--ok)' : 'var(--accent)',
            color: '#fff',
          }}
        >
          {completed ? <CheckIcon /> : <ScrollIcon />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[10.5px] font-semibold uppercase"
              style={{ color: completed ? 'var(--ok)' : 'var(--accent-strong)', letterSpacing: '0.08em' }}
            >
              Daily quest · {quest.date}
            </span>
            <span
              className="font-mono text-[10.5px]"
              style={{ color: 'var(--fg-faint)' }}
            >
              +{quest.xpBonus} XP
            </span>
          </div>
          <span className="text-[15px] font-semibold" style={{ color: 'var(--fg)', letterSpacing: '-0.005em' }}>
            {quest.quest.label}
          </span>
          {!completed && (
            <span className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
              Resets in {pad(t.hours)}:{pad(t.minutes)}:{pad(t.seconds)}
            </span>
          )}
          {completed && (
            <span className="text-[12px]" style={{ color: 'var(--ok)' }}>
              Completed — see you tomorrow.
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full font-mono text-[12px] font-bold"
            style={{ background: 'rgba(255,255,255,0.7)', color: completed ? 'var(--ok)' : 'var(--accent-strong)' }}
          >
            {completed ? '✓' : '0/1'}
          </div>
        </div>
      </div>
    </div>
  )
}
