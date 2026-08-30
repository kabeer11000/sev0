interface LevelDef {
  title: string
  minXp: number
}

const LEVELS: LevelDef[] = [
  { title: 'Cadet', minXp: 0 },
  { title: 'On-call Engineer', minXp: 100 },
  { title: 'Senior SRE', minXp: 500 },
  { title: 'Incident Commander', minXp: 1500 },
  { title: 'Principal Architect', minXp: 4000 },
  { title: 'Distinguished Engineer', minXp: 8000 },
]

export function levelFor(xp: number): LevelDef {
  let current = LEVELS[0]
  for (const level of LEVELS) {
    if (xp >= level.minXp) current = level
    else break
  }
  return current
}

export function nextLevel(xp: number): LevelDef | null {
  for (const level of LEVELS) {
    if (level.minXp > xp) return level
  }
  return null
}

export function levelProgress(xp: number): { current: LevelDef; next: LevelDef | null; pct: number } {
  const current = levelFor(xp)
  const next = nextLevel(xp)
  if (!next) return { current, next: null, pct: 1 }
  const span = next.minXp - current.minXp
  const earned = xp - current.minXp
  return { current, next, pct: Math.min(1, earned / span) }
}