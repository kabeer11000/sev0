import type { Scenario } from '../scenario/types'

export const DIFFICULTY_LABEL: Record<Scenario['difficulty'], string> = {
  tutorial: 'Tutorial',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const DIFFICULTY_COLOR: Record<Scenario['difficulty'], string> = {
  tutorial: 'var(--accent)',
  easy: 'var(--ok)',
  medium: 'var(--warn)',
  hard: 'var(--crit)',
}
