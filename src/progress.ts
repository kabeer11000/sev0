import type { Scenario } from './scenario/types'
import type { BadgeId } from './badges'

export interface SolvedMeta {
  solvedAt: number
  resolutionMs: number
  hintsUsed: number
  solutionRevealed: boolean
  xp: number
  bestResolutionMs: number
}

interface ProgressV2 {
  v: 2
  solved: Record<string, SolvedMeta>
  badges: BadgeId[]
  totalXp: number
}

const V2_KEY = 'sev0_progress_v2'

function emptyV2(): ProgressV2 {
  return { v: 2, solved: {}, badges: [], totalXp: 0 }
}

function readV2(): ProgressV2 {
  try {
    const raw = localStorage.getItem(V2_KEY)
    if (!raw) return migrateFromV1()
    const parsed = JSON.parse(raw)
    if (parsed && parsed.v === 2 && parsed.solved && typeof parsed.solved === 'object') {
      return {
        v: 2,
        solved: parsed.solved,
        badges: Array.isArray(parsed.badges) ? parsed.badges : [],
        totalXp: typeof parsed.totalXp === 'number' ? parsed.totalXp : 0,
      }
    }
    return migrateFromV1()
  } catch {
    return migrateFromV1()
  }
}

function migrateFromV1(): ProgressV2 {
  const out = emptyV2()
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith('sev0_solved_') && localStorage.getItem(key) === '1') {
        const caseId = key.slice('sev0_solved_'.length)
        out.solved[caseId] = {
          solvedAt: 0,
          resolutionMs: 0,
          hintsUsed: 0,
          solutionRevealed: false,
          xp: 0,
          bestResolutionMs: 0,
        }
      }
    }
  } catch {
    // ignore
  }
  return out
}

function writeV2(state: ProgressV2) {
  try {
    localStorage.setItem(V2_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function loadProgress(): ProgressV2 {
  return readV2()
}

export function isScenarioSolved(scenario: Scenario): boolean {
  return scenario.caseId in readV2().solved
}

export function getSolveMeta(scenario: Scenario): SolvedMeta | undefined {
  return readV2().solved[scenario.caseId]
}

export interface SaveSolveResult {
  meta: SolvedMeta
  newBest: boolean
}

export function saveSolve(
  scenario: Scenario,
  args: { resolutionMs: number; hintsUsed: number; solutionRevealed: boolean; xp: number },
): SaveSolveResult {
  const state = readV2()
  const existing = state.solved[scenario.caseId]
  const previousBest = existing?.bestResolutionMs ?? Number.POSITIVE_INFINITY
  const best = Math.min(previousBest, args.resolutionMs)
  const newBest = args.resolutionMs < previousBest
  const meta: SolvedMeta = {
    solvedAt: Date.now(),
    resolutionMs: args.resolutionMs,
    hintsUsed: args.hintsUsed,
    solutionRevealed: args.solutionRevealed,
    xp: args.xp,
    bestResolutionMs: best,
  }
  state.solved[scenario.caseId] = meta
  state.totalXp = Object.values(state.solved).reduce((sum, m) => sum + (m.xp || 0), 0)
  writeV2(state)
  return { meta, newBest }
}

export function addBadges(ids: BadgeId[]): BadgeId[] {
  if (ids.length === 0) return []
  const state = readV2()
  const owned = new Set(state.badges)
  const newlyAdded: BadgeId[] = []
  for (const id of ids) {
    if (!owned.has(id)) {
      owned.add(id)
      newlyAdded.push(id)
    }
  }
  if (newlyAdded.length > 0) {
    state.badges = Array.from(owned)
    writeV2(state)
  }
  return newlyAdded
}

export function markScenarioSolved(scenario: Scenario) {
  const state = readV2()
  if (!(scenario.caseId in state.solved)) {
    state.solved[scenario.caseId] = {
      solvedAt: Date.now(),
      resolutionMs: 0,
      hintsUsed: 0,
      solutionRevealed: false,
      xp: 0,
      bestResolutionMs: 0,
    }
    writeV2(state)
  }
}

const RANKS = ['New hire', 'Rookie on-call', 'On-call engineer', 'Senior SRE', 'Incident Commander']

export function rankFor(solvedCount: number, total: number): string {
  if (solvedCount >= total && total > 0) return RANKS[RANKS.length - 1]
  const idx = Math.floor((solvedCount / Math.max(1, total)) * (RANKS.length - 1))
  return RANKS[Math.min(RANKS.length - 2, idx)]
}