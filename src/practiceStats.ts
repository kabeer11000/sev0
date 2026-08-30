import type { Scenario } from './scenario/types'

const KEY = 'sev0_practice_runs_v1'

interface RunStats {
  count: number
}

function readAll(): Record<string, RunStats> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, RunStats>
  } catch {
    return {}
  }
}

function writeAll(stats: Record<string, RunStats>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats))
  } catch {
    // ignore
  }
}

export function recordPracticeRun(scenario: Scenario): number {
  const all = readAll()
  const current = all[scenario.caseId]?.count ?? 0
  const next = current + 1
  all[scenario.caseId] = { count: next }
  writeAll(all)
  return next
}

export function getPracticeRunCount(scenario: Scenario): number {
  const all = readAll()
  return all[scenario.caseId]?.count ?? 0
}
