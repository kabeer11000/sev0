import { Mascot } from './Mascot'
import { useMascotMood } from './useMascotMood'

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function nudgeFor(mood: string): string | null {
  switch (mood) {
    case 'panicked': return 'over time!'
    case 'worried': return 'less than 25% left'
    case 'alert': return 'half time gone'
    case 'bored': return 'idle 30s — what now?'
    case 'sleepy': return 'dozing off…'
    case 'scared': return 'grading your fix…'
    case 'curious': return 'hint revealed'
    case 'disappointed': return 'no-peeking bonus: gone'
    case 'sad': return "didn't pass — try again"
    default: return null
  }
}

export function ElapsedTimer() {
  const { mood, overtime, remaining } = useMascotMood()

  const dotColor =
    overtime ? 'var(--crit)' :
    mood === 'worried' || mood === 'panicked' ? 'var(--warn)' :
    'var(--ok)'

  const nudge = nudgeFor(mood)

  return (
    <div className="flex items-center gap-2">
      <Mascot mood={mood} />
      <span
        className="flex items-center gap-1.5 font-mono text-[11.5px] font-semibold tabular-nums"
        style={{ color: overtime ? 'var(--crit)' : 'var(--fg-muted)' }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
        {overtime ? '+' : ''}
        {formatClock(remaining)}
      </span>
      {nudge && (
        <span
          className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-all"
          style={{
            background: overtime ? 'var(--crit-bg)' : mood === 'worried' || mood === 'panicked' ? 'var(--warn-bg)' : 'var(--surface)',
            color: overtime ? 'var(--crit)' : mood === 'worried' || mood === 'panicked' ? 'var(--warn)' : 'var(--fg-muted)',
          }}
        >
          {nudge}
        </span>
      )}
    </div>
  )
}
