import type { Scenario } from './scenario/types'
import { SCENARIOS } from './scenario/scenarios'

export type BadgeId =
  | 'first-blood'
  | 'hat-trick'
  | 'on-fire'
  | 'speed-demon'
  | 'no-peeking'
  | 'ghost-protocol'
  | 'iron-will'
  | 'centurion'

export interface BadgeContext {
  caseId: string
  scenario: Scenario
  resolutionMs: number
  hintsRevealed: number
  solutionRevealed: boolean
  solvedCaseIds: ReadonlyArray<string>
  streakCount: number
}

export interface BadgeDef {
  id: BadgeId
  label: string
  blurb: string
  check: (ctx: BadgeContext) => boolean
}

const FIVE_MIN_MS = 5 * 60 * 1000
const hardScenarios = SCENARIOS.filter((s) => s.difficulty === 'hard')

export const BADGES: BadgeDef[] = [
  {
    id: 'first-blood',
    label: 'First Blood',
    blurb: 'First incident resolved.',
    check: ({ solvedCaseIds }) => solvedCaseIds.length === 1,
  },
  {
    id: 'hat-trick',
    label: 'Hat Trick',
    blurb: 'Three incidents resolved.',
    check: ({ solvedCaseIds }) => solvedCaseIds.length >= 3,
  },
  {
    id: 'on-fire',
    label: 'On Fire',
    blurb: 'A 3-day solve streak.',
    check: ({ streakCount }) => streakCount >= 3,
  },
  {
    id: 'speed-demon',
    label: 'Speed Demon',
    blurb: 'Resolved an incident in under five minutes.',
    check: ({ resolutionMs }) => resolutionMs < FIVE_MIN_MS,
  },
  {
    id: 'no-peeking',
    label: 'No Peeking',
    blurb: 'Resolved without revealing a single hint.',
    check: ({ hintsRevealed }) => hintsRevealed === 0,
  },
  {
    id: 'ghost-protocol',
    label: 'Ghost Protocol',
    blurb: 'Resolved without revealing the solution.',
    check: ({ solutionRevealed }) => !solutionRevealed,
  },
  {
    id: 'iron-will',
    label: 'Iron Will',
    blurb: 'Every hard incident resolved.',
    check: ({ solvedCaseIds }) => hardScenarios.every((s) => solvedCaseIds.includes(s.caseId)),
  },
  {
    id: 'centurion',
    label: 'Centurion',
    blurb: 'Every incident resolved.',
    check: ({ solvedCaseIds }) => SCENARIOS.every((s) => solvedCaseIds.includes(s.caseId)),
  },
]

export const BADGE_BY_ID: Record<BadgeId, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.id, b]),
) as Record<BadgeId, BadgeDef>

export function evaluateEarned(ctx: BadgeContext): BadgeId[] {
  return BADGES.filter((b) => b.check(ctx)).map((b) => b.id)
}

export function evaluateNewlyEarned(earned: BadgeId[], alreadyOwned: ReadonlyArray<BadgeId>): BadgeId[] {
  const owned = new Set(alreadyOwned)
  return earned.filter((id) => !owned.has(id))
}