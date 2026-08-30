import { SCENARIOS } from './scenario/scenarios'
import { loadProgress } from './progress'
import { readStreak } from './streak'

export type QuestKind =
  | { kind: 'solve-one'; label: string }
  | { kind: 'solve-difficulty'; difficulty: 'easy' | 'medium' | 'hard'; label: string }
  | { kind: 'solve-replay'; caseId: string; label: string }
  | { kind: 'streak-extend'; label: string }

export interface DailyQuest {
  date: string // YYYY-MM-DD
  quest: QuestKind
  xpBonus: number
  completedAt?: number
}

interface QuestState {
  date: string
  quest: QuestKind
  xpBonus: number
  completedAt?: number
  lastClaimedDate?: string // claim toast may show across days
}

const QUEST_KEY = 'sev0_quest_v1'

interface QuestTemplate {
  kind: 'solve-one' | 'solve-difficulty' | 'streak-extend'
  difficulty?: 'easy' | 'medium' | 'hard'
}

const POOL: QuestTemplate[] = [
  { kind: 'solve-one' },
  { kind: 'solve-difficulty', difficulty: 'easy' },
  { kind: 'solve-difficulty', difficulty: 'medium' },
  { kind: 'solve-difficulty', difficulty: 'hard' },
  { kind: 'streak-extend' },
]

function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function questLabel(tmpl: QuestTemplate): string {
  switch (tmpl.kind) {
    case 'solve-one':
      return "Solve any incident today"
    case 'solve-difficulty': {
      const d = tmpl.difficulty ?? 'easy'
      const word = d === 'easy' ? 'an Easy' : d === 'medium' ? 'a Medium' : 'a Hard'
      return `Tackle ${word} incident`
    }
    case 'streak-extend':
      return 'Solve one incident to keep your streak alive'
  }
}

function questXpBonus(tmpl: QuestTemplate): number {
  switch (tmpl.kind) {
    case 'solve-one':
      return 50
    case 'solve-difficulty': {
      const d = tmpl.difficulty ?? 'easy'
      return d === 'hard' ? 200 : d === 'medium' ? 100 : 60
    }
    case 'streak-extend':
      return 75
  }
}

function rollQuest(date: string): QuestKind {
  const seed = hashSeed(date)
  // 1-in-6 chance to be a replay quest if there's an incident already solved
  const progress = loadProgress()
  const solvedIds = Object.keys(progress.solved)
  if (solvedIds.length > 0 && seed % 6 === 0) {
    const idx = seed % solvedIds.length
    const caseId = solvedIds[idx] ?? solvedIds[0] ?? ''
    const sc = SCENARIOS.find((s) => s.caseId === caseId)
    const label = sc ? `Replay ${sc.displayTitle}` : 'Replay a solved incident'
    return { kind: 'solve-replay', caseId, label }
  }
  const idx = seed % POOL.length
  const tmpl = POOL[idx] ?? POOL[0]!
  if (tmpl.kind === 'solve-difficulty') {
    const d = tmpl.difficulty ?? 'easy'
    return { kind: 'solve-difficulty', difficulty: d, label: questLabel(tmpl) }
  }
  if (tmpl.kind === 'streak-extend') {
    return { kind: 'streak-extend', label: questLabel(tmpl) }
  }
  return { kind: 'solve-one', label: questLabel(tmpl) }
}

function readQuestState(): QuestState | null {
  try {
    const raw = localStorage.getItem(QUEST_KEY)
    if (!raw) return null
    return JSON.parse(raw) as QuestState
  } catch {
    return null
  }
}

function writeQuestState(state: QuestState): void {
  try {
    localStorage.setItem(QUEST_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function getTodayQuest(): DailyQuest {
  const today = todayKey()
  const state = readQuestState()
  if (state && state.date === today) {
    return {
      date: today,
      quest: state.quest,
      xpBonus: state.xpBonus,
      completedAt: state.completedAt,
    }
  }
  const quest = rollQuest(today)
  const xpBonus = quest.kind === 'solve-replay' ? 30 : questXpBonus(quest)
  const next: QuestState = { date: today, quest, xpBonus }
  writeQuestState(next)
  return { date: today, quest, xpBonus }
}

export function isQuestCompleted(quest: DailyQuest = getTodayQuest()): boolean {
  return quest.completedAt !== undefined
}

interface CheckInput {
  caseId: string
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard'
  isReplay: boolean
}

export function checkQuestCompletion(input: CheckInput): { completed: boolean; bonus: number; label: string | null } {
  const quest = getTodayQuest()
  if (quest.completedAt) return { completed: false, bonus: 0, label: null }

  const q = quest.quest
  let completed = false

  switch (q.kind) {
    case 'solve-one':
      completed = true
      break
    case 'solve-difficulty':
      completed = input.difficulty === q.difficulty
      break
    case 'solve-replay':
      completed = input.isReplay && input.caseId === q.caseId
      break
    case 'streak-extend': {
      const streak = readStreak()
      completed = streak.count >= 1
      break
    }
  }

  if (!completed) return { completed: false, bonus: 0, label: null }

  const state = readQuestState()
  if (state && state.date === quest.date) {
    state.completedAt = Date.now()
    state.lastClaimedDate = quest.date
    writeQuestState(state)
  }
  return { completed: true, bonus: quest.xpBonus, label: q.label }
}

export function timeUntilNextQuest(): { hours: number; minutes: number; seconds: number } {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setHours(24, 0, 0, 0)
  const ms = tomorrow.getTime() - now.getTime()
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  return {
    hours: Math.floor(totalSec / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  }
}
