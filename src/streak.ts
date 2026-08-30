const STREAK_KEY = 'sev0_streak_v1'

export interface StreakState {
  count: number
  best: number
  lastDay: string
}

function readRaw(): StreakState | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.count === 'number' &&
      typeof parsed?.best === 'number' &&
      typeof parsed?.lastDay === 'string'
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeRaw(state: StreakState) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(state))
  } catch {
    // ignore — private browsing / storage blocked
  }
}

function todayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dayBefore(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function readStreak(): StreakState {
  return readRaw() ?? { count: 0, best: 0, lastDay: '' }
}

export interface StreakUpdate {
  count: number
  best: number
  incremented: boolean
}

export function recordSolveOnDay(): StreakUpdate {
  const today = todayLocal()
  const existing = readRaw()
  if (!existing) {
    const fresh: StreakState = { count: 1, best: 1, lastDay: today }
    writeRaw(fresh)
    return { count: 1, best: 1, incremented: false }
  }
  if (existing.lastDay === today) {
    return { count: existing.count, best: existing.best, incremented: false }
  }
  const incremented = existing.lastDay === dayBefore(today)
  const next: StreakState = {
    count: incremented ? existing.count + 1 : 1,
    best: Math.max(existing.best, incremented ? existing.count + 1 : 1),
    lastDay: today,
  }
  writeRaw(next)
  return { count: next.count, best: next.best, incremented: incremented && next.count > 1 }
}