import type { Scenario } from './scenario/types'

function solvedKey(scenario: Scenario): string {
  return `sev0_solved_${scenario.caseId}`
}

export function isScenarioSolved(scenario: Scenario): boolean {
  try {
    return localStorage.getItem(solvedKey(scenario)) === '1'
  } catch {
    return false
  }
}

export function markScenarioSolved(scenario: Scenario) {
  try {
    localStorage.setItem(solvedKey(scenario), '1')
  } catch {
    // ignore — private browsing / storage blocked
  }
}

const RANKS = ['New hire', 'Rookie on-call', 'On-call engineer', 'Senior SRE', 'Incident Commander']

// a light, narrative-only rank based on how many incidents are resolved —
// no points to game, just a title that moves as the list fills in
export function rankFor(solvedCount: number, total: number): string {
  if (solvedCount >= total && total > 0) return RANKS[RANKS.length - 1]
  const idx = Math.floor((solvedCount / Math.max(1, total)) * (RANKS.length - 1))
  return RANKS[Math.min(RANKS.length - 2, idx)]
}
