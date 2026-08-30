import type { Scenario } from './scenario/types'

export interface XpBreakdown {
  base: number
  time: number
  hint: number
  soln: number
  first: number
  total: number
}

const BASE_XP: Record<Scenario['difficulty'], number> = {
  tutorial: 50,
  easy: 100,
  medium: 200,
  hard: 400,
}

export function computeXp(
  scenario: Scenario,
  resolutionMs: number,
  hintsRevealed: number,
  solutionRevealed: boolean,
  isFirstSolve: boolean,
): XpBreakdown {
  const base = BASE_XP[scenario.difficulty]
  const timeSaved = Math.max(0, scenario.timeLimitMs - resolutionMs)
  const time = Math.floor(timeSaved / 60_000)
  const hint = -50 * hintsRevealed
  const soln = solutionRevealed ? 0 : 200
  const first = isFirstSolve ? 100 : 0
  const total = base + time + hint + soln + first
  return { base, time, hint, soln, first, total }
}