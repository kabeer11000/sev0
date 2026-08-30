import { create } from 'zustand'
import type { Scenario } from './scenario/types'
import { tutorialScenario } from './scenario/tutorial'
import { getScenarioByCaseId } from './scenario/scenarios'
import { buildFilesystem, buildIotFilesystem } from './scenario/filesystem'
import type { FsFile } from './scenario/filesystem'
import { runScenario, submitScenario } from './runner'
import type { RunResult, SubmitResult } from './runner'
import { runIotScenario, submitIotScenario } from './iotRunner'
import type { IotRunResult, IotSubmitResult } from './iotRunner'
import { readSharedSolutionFromHash, clearShareHash } from './ui/shareUtils'
import { parseRoute } from './router'
import { isScenarioSolved, saveSolve, addBadges, loadProgress } from './progress'
import { computeXp } from './xp'
import { evaluateEarned, BADGE_BY_ID } from './badges'
import type { BadgeId } from './badges'
import { recordSolveOnDay } from './streak'
import { levelFor } from './levels'
import { checkQuestCompletion } from './quests'
import { recordPracticeRun } from './practiceStats'

function fmtDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// best-effort — if the player isn't signed in this 401s and we just don't
// track it server-side; localStorage already recorded the solve either way
function reportSolveToServer(scenario: Scenario, body: { resolutionMs: number; hintsUsed: number; solutionRevealed: boolean }) {
  fetch('/api/progress', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ caseId: scenario.caseId, ...body }),
  }).catch(() => {})
}

function lastEditableVfsPath(scenario: Scenario): string {
  return `services/${scenario.editableFiles[scenario.editableFiles.length - 1].path}`
}

export type CenterTab =
  | { id: 'incident'; kind: 'incident' }
  | { id: 'docs'; kind: 'docs' }
  | { id: 'hints'; kind: 'hints' }
  | { id: `file:${string}`; kind: 'file'; path: string }
export type BottomTab = { id: 'feed'; kind: 'feed' } | { id: `terminal:${string}`; kind: 'terminal'; nodeId: string }

export interface ContextMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  separatorBefore?: boolean
}

export interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

export interface TerminalLine {
  cmd: string
  output: string[]
}

export interface ToastItem {
  id: string
  text: string
  createdAt: number
  tone?: 'default' | 'accent' | 'ok' | 'warn' | 'crit'
  breakdown?: Array<{ label: string; value: number }>
}

const TUTORIAL_SEEN_KEY = 'sev0_tutorial_seen'
const EDITOR_THEME_KEY = 'sev0_editor_theme'

export type EditorTheme = 'light' | 'dark'

function loadEditorTheme(): EditorTheme {
  try {
    const raw = localStorage.getItem(EDITOR_THEME_KEY)
    return raw === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1')
  } catch {
    // ignore — private browsing / storage blocked
  }
}

function codeStorageKey(scenario: Scenario): string {
  return `sev0_code_${scenario.caseId}`
}

function helpStorageKey(scenario: Scenario): string {
  return `sev0_help_${scenario.caseId}`
}

interface HelpProgress {
  hintsRevealed: number
  solutionRevealed: boolean
}

function loadHelpProgress(scenario: Scenario): HelpProgress {
  try {
    const raw = localStorage.getItem(helpStorageKey(scenario))
    if (!raw) return { hintsRevealed: 0, solutionRevealed: false }
    return { hintsRevealed: 0, solutionRevealed: false, ...JSON.parse(raw) }
  } catch {
    return { hintsRevealed: 0, solutionRevealed: false }
  }
}

function saveHelpProgress(scenario: Scenario, progress: HelpProgress) {
  try {
    localStorage.setItem(helpStorageKey(scenario), JSON.stringify(progress))
  } catch {
    // ignore — private browsing / storage blocked
  }
}

function loadSavedCode(scenario: Scenario): Record<string, string> {
  try {
    const raw = localStorage.getItem(codeStorageKey(scenario))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveCode(scenario: Scenario, code: Record<string, string>) {
  try {
    const editablePaths = scenario.editableFiles.map((f) => `services/${f.path}`)
    const toSave = Object.fromEntries(editablePaths.filter((p) => code[p] != null).map((p) => [p, code[p]]))
    localStorage.setItem(codeStorageKey(scenario), JSON.stringify(toSave))
  } catch {
    // ignore — private browsing / storage blocked
  }
}

function taskStartedKey(scenario: Scenario): string {
  return `sev0_started_${scenario.caseId}`
}

// first time an incident is opened, stamp it — every visit after that reads
// the same timestamp back, so the timer reflects real elapsed time on the
// task rather than resetting on every reload
function loadOrInitTaskStartedAt(scenario: Scenario): number {
  try {
    const key = taskStartedKey(scenario)
    const raw = localStorage.getItem(key)
    if (raw) return Number(raw)
    const now = Date.now()
    localStorage.setItem(key, String(now))
    return now
  } catch {
    return Date.now()
  }
}

function resolveInitialScenario(): Scenario {
  const route = parseRoute(typeof location !== 'undefined' ? location.pathname : '/')
  if (route.type === 'incident') {
    const s = getScenarioByCaseId(route.caseId)
    if (s) return s
  }
  return tutorialScenario
}

interface ScenarioLoad {
  scenario: Scenario
  filesystem: FsFile[]
  code: Record<string, string>
  taskStartedAt: number
  helpProgress: HelpProgress
  toast?: string
}

function loadScenarioData(scenario: Scenario): ScenarioLoad {
  const filesystem = scenario.domain === 'iot' ? buildIotFilesystem(scenario) : buildFilesystem(scenario)
  const starterCode: Record<string, string> = Object.fromEntries(
    filesystem.filter((f) => f.editable).map((f) => [f.path, f.content]),
  )
  const saved = loadSavedCode(scenario)
  const sharedCode = readSharedSolutionFromHash()
  const code = { ...starterCode, ...saved, ...(sharedCode ?? {}) }
  if (sharedCode) clearShareHash()
  return {
    scenario,
    filesystem,
    code,
    taskStartedAt: loadOrInitTaskStartedAt(scenario),
    helpProgress: loadHelpProgress(scenario),
    toast: sharedCode ? "Loaded a shared solution — this is someone else's code, not the starter" : undefined,
  }
}

export interface LastResolution {
  xp: number
  streakCount: number
  badges: BadgeId[]
  levelBefore: string
  levelAfter: string
  leveledUp: boolean
  newBest: boolean
  resolutionMs: number
}

interface Sev0State {
  scenario: Scenario
  filesystem: FsFile[]
  code: Record<string, string> // keyed by full vfs path, editable files only

  centerTabs: CenterTab[]
  activeCenterTabId: string
  bottomTabs: BottomTab[]
  activeBottomTabId: string
  terminals: Record<string, TerminalLine[]> // keyed by nodeId
  taskStartedAt: number
  hintsRevealed: number
  solutionRevealed: boolean
  solved: boolean

  isRunning: boolean
  isSubmitting: boolean
  lastRun?: RunResult | IotRunResult
  submitResult?: SubmitResult | IotSubmitResult
  scrubberT: number
  playing: boolean
  tutorialOpen: boolean
  commandPaletteOpen: boolean
  toasts: ToastItem[]
  celebratingBadges: BadgeId[]
  solveCelebrationKey: number
  lastResolution?: LastResolution
  editorTheme: EditorTheme

  contextMenu?: ContextMenuState

  loadScenario: (scenario: Scenario) => void
  restartIncident: () => void
  setEditorTheme: (t: EditorTheme) => void
  setTutorialOpen: (v: boolean) => void
  setCommandPaletteOpen: (v: boolean) => void
  showToast: (msg: string, tone?: ToastItem['tone']) => void
  dismissToast: (id: string) => void
  dismissCelebration: () => void
  openFile: (path: string) => void
  openIncident: () => void
  openDocs: () => void
  openHints: () => void
  revealNextHint: () => void
  revealSolution: () => void
  closeCenterTab: (id: string) => void
  setActiveCenterTab: (id: string) => void
  openTerminal: (nodeId: string) => void
  closeBottomTab: (id: string) => void
  setActiveBottomTab: (id: string) => void
  setCode: (path: string, value: string) => void
  runPractice: () => Promise<void>
  submit: () => Promise<void>
  setScrubberT: (t: number) => void
  setPlaying: (p: boolean) => void
  resetFile: (path: string) => void
  openContextMenu: (state: ContextMenuState) => void
  closeContextMenu: () => void
  runTerminalCommand: (nodeId: string, cmd: string, output: string[]) => void
  clearTerminal: (nodeId: string) => void
}

const initialLoad = loadScenarioData(resolveInitialScenario())

function fileContent(s: Pick<Sev0State, 'code' | 'filesystem'>, path: string): string {
  return s.code[path] ?? s.filesystem.find((f) => f.path === path)?.content ?? ''
}

function checkoutCode(s: Pick<Sev0State, 'code' | 'filesystem'>): { api: string; worker: string } {
  return {
    api: fileContent(s, 'services/orders-api/handler.ts'),
    worker: fileContent(s, 'services/worker/consume.ts'),
  }
}

function iotCode(s: Pick<Sev0State, 'code' | 'filesystem'>): { dataEntry: string; statsGen: string } {
  return {
    dataEntry: fileContent(s, 'services/dataentry-lambda/handler.ts'),
    statsGen: fileContent(s, 'services/shift-aggregator/handler.ts'),
  }
}

export const useSev0Store = create<Sev0State>((set, get) => ({
  scenario: initialLoad.scenario,
  filesystem: initialLoad.filesystem,
  code: initialLoad.code,

  centerTabs: [
    { id: 'incident', kind: 'incident' },
    { id: 'docs', kind: 'docs' },
    { id: 'hints', kind: 'hints' },
  ],
  activeCenterTabId: initialLoad.toast ? `file:${lastEditableVfsPath(initialLoad.scenario)}` : 'incident',
  bottomTabs: [{ id: 'feed', kind: 'feed' }],
  activeBottomTabId: 'feed',
  terminals: {},
  taskStartedAt: initialLoad.taskStartedAt,
  hintsRevealed: initialLoad.helpProgress.hintsRevealed,
  solutionRevealed: initialLoad.helpProgress.solutionRevealed,
  solved: isScenarioSolved(initialLoad.scenario),

  isRunning: false,
  isSubmitting: false,
  lastRun: undefined,
  submitResult: undefined,
  scrubberT: 0,
  playing: false,
  tutorialOpen: !hasSeenTutorial() && !initialLoad.toast,
  commandPaletteOpen: false,
  toasts: initialLoad.toast ? [{ id: 'shared-solution', text: initialLoad.toast, createdAt: Date.now() }] : [],
  celebratingBadges: [],
  solveCelebrationKey: 0,
  contextMenu: undefined,
  editorTheme: loadEditorTheme(),

  loadScenario: (scenario) => {
    saveCode(get().scenario, get().code)
    const loaded = loadScenarioData(scenario)
    set({
      scenario: loaded.scenario,
      filesystem: loaded.filesystem,
      code: loaded.code,
      centerTabs: [
        { id: 'incident', kind: 'incident' },
        { id: 'docs', kind: 'docs' },
        { id: 'hints', kind: 'hints' },
      ],
      activeCenterTabId: loaded.toast ? `file:${lastEditableVfsPath(loaded.scenario)}` : 'incident',
      bottomTabs: [{ id: 'feed', kind: 'feed' }],
      activeBottomTabId: 'feed',
      terminals: {},
      taskStartedAt: loaded.taskStartedAt,
      hintsRevealed: loaded.helpProgress.hintsRevealed,
      solutionRevealed: loaded.helpProgress.solutionRevealed,
      solved: isScenarioSolved(loaded.scenario),
      lastRun: undefined,
      submitResult: undefined,
      scrubberT: 0,
      playing: false,
      toasts: loaded.toast ? [{ id: 'shared-solution', text: loaded.toast, createdAt: Date.now() }] : [],
      celebratingBadges: [],
      solveCelebrationKey: 0,
      lastResolution: undefined,
    })
  },

  restartIncident: () => {
    const s = get()
    try {
      localStorage.removeItem(taskStartedKey(s.scenario))
      localStorage.removeItem(codeStorageKey(s.scenario))
      localStorage.removeItem(helpStorageKey(s.scenario))
    } catch {
      // ignore — private browsing / storage blocked
    }
    const loaded = loadScenarioData(s.scenario)
    set({
      code: loaded.code,
      taskStartedAt: loaded.taskStartedAt,
      hintsRevealed: loaded.helpProgress.hintsRevealed,
      solutionRevealed: loaded.helpProgress.solutionRevealed,
      lastRun: undefined,
      submitResult: undefined,
      scrubberT: 0,
      playing: false,
      terminals: {},
      solved: isScenarioSolved(loaded.scenario),
      toasts: [{ id: `restart-${Date.now()}`, text: 'Restarted — fresh code, fresh timer', createdAt: Date.now(), tone: 'ok' }],
    })
  },

  setTutorialOpen: (v) => {
    if (!v) markTutorialSeen()
    set({ tutorialOpen: v })
  },
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  showToast: (msg, tone) =>
    set((s) => ({
      toasts: [...s.toasts, { id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: msg, createdAt: Date.now(), tone }],
    })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  dismissCelebration: () => set({ celebratingBadges: [] }),

  openFile: (path) =>
    set((s) => {
      const id = `file:${path}` as const
      const exists = s.centerTabs.some((t) => t.id === id)
      return {
        centerTabs: exists ? s.centerTabs : [...s.centerTabs, { id, kind: 'file', path }],
        activeCenterTabId: id,
      }
    }),

  openIncident: () => set({ activeCenterTabId: 'incident' }),
  openDocs: () => set({ activeCenterTabId: 'docs' }),
  openHints: () => set({ activeCenterTabId: 'hints' }),

  revealNextHint: () =>
    set((s) => {
      const hintsRevealed = Math.min(s.scenario.hints.length, s.hintsRevealed + 1)
      saveHelpProgress(s.scenario, { hintsRevealed, solutionRevealed: s.solutionRevealed })
      return { hintsRevealed }
    }),

  revealSolution: () =>
    set((s) => {
      saveHelpProgress(s.scenario, { hintsRevealed: s.hintsRevealed, solutionRevealed: true })
      return { solutionRevealed: true }
    }),

  closeCenterTab: (id) =>
    set((s) => {
      if (id === 'incident' || id === 'docs' || id === 'hints') return {}
      const idx = s.centerTabs.findIndex((t) => t.id === id)
      if (idx === -1) return {}
      const nextTabs = s.centerTabs.filter((t) => t.id !== id)
      let activeCenterTabId = s.activeCenterTabId
      if (activeCenterTabId === id) {
        const fallback = nextTabs[idx - 1] ?? nextTabs[0] ?? { id: 'incident', kind: 'incident' as const }
        activeCenterTabId = fallback.id
      }
      return { centerTabs: nextTabs, activeCenterTabId }
    }),

  setActiveCenterTab: (id) => set({ activeCenterTabId: id }),

  openTerminal: (nodeId) =>
    set((s) => {
      const id = `terminal:${nodeId}` as const
      const exists = s.bottomTabs.some((t) => t.id === id)
      return {
        bottomTabs: exists ? s.bottomTabs : [...s.bottomTabs, { id, kind: 'terminal', nodeId }],
        activeBottomTabId: id,
      }
    }),

  closeBottomTab: (id) =>
    set((s) => {
      if (id === 'feed') return {}
      const idx = s.bottomTabs.findIndex((t) => t.id === id)
      if (idx === -1) return {}
      const nextTabs = s.bottomTabs.filter((t) => t.id !== id)
      let activeBottomTabId = s.activeBottomTabId
      if (activeBottomTabId === id) {
        const fallback = nextTabs[idx - 1] ?? nextTabs[0] ?? { id: 'feed', kind: 'feed' as const }
        activeBottomTabId = fallback.id
      }
      return { bottomTabs: nextTabs, activeBottomTabId }
    }),

  setActiveBottomTab: (id) => set({ activeBottomTabId: id }),

  setCode: (path, value) =>
    set((s) => {
      const code = { ...s.code, [path]: value }
      saveCode(s.scenario, code)
      return { code }
    }),

  resetFile: (path) => {
    const starter = get().filesystem.find((f) => f.path === path)?.content ?? ''
    set((s) => {
      const code = { ...s.code, [path]: starter }
      saveCode(s.scenario, code)
      return { code }
    })
  },

  runPractice: async () => {
    const s = get()
    set({ isRunning: true, submitResult: undefined })
    try {
      const result =
        s.scenario.domain === 'iot'
          ? await runIotScenario(s.scenario, iotCode(s), s.scenario.practiceSeed)
          : await runScenario(s.scenario, checkoutCode(s), s.scenario.practiceSeed)
      recordPracticeRun(s.scenario)
      set((s2) => ({
        lastRun: result,
        scrubberT: 0,
        playing: !result.error,
        activeBottomTabId: result.error ? s2.activeBottomTabId : 'feed',
      }))
    } finally {
      set({ isRunning: false })
    }
  },

  submit: async () => {
    const s = get()
    set({ isSubmitting: true })
    try {
      const result =
        s.scenario.domain === 'iot' ? await submitIotScenario(s.scenario, iotCode(s)) : await submitScenario(s.scenario, checkoutCode(s))
      if (result.passed) {
        // reset timer + saved code for the next visit, but keep current in-memory
        // state so the user can keep admiring the result panel until they navigate
        try {
          localStorage.removeItem(taskStartedKey(s.scenario))
          localStorage.removeItem(codeStorageKey(s.scenario))
          localStorage.removeItem(helpStorageKey(s.scenario))
        } catch {
          // ignore — private browsing / storage blocked
        }
        const resolutionMs = Date.now() - s.taskStartedAt
        const priorProgress = loadProgress()
        const isFirstSolve = !(s.scenario.caseId in priorProgress.solved)
        const xpBreakdown = computeXp(s.scenario, resolutionMs, s.hintsRevealed, s.solutionRevealed, isFirstSolve)
        const levelBeforeTitle = levelFor(priorProgress.totalXp).title
        const { newBest } = saveSolve(s.scenario, {
          resolutionMs,
          hintsUsed: s.hintsRevealed,
          solutionRevealed: s.solutionRevealed,
          xp: xpBreakdown.total,
        })
        reportSolveToServer(s.scenario, {
          resolutionMs,
          hintsUsed: s.hintsRevealed,
          solutionRevealed: s.solutionRevealed,
        })
        const streak = recordSolveOnDay()
        const updatedProgress = loadProgress()
        const solvedIds = Object.keys(updatedProgress.solved)
        const earned = evaluateEarned({
          caseId: s.scenario.caseId,
          scenario: s.scenario,
          resolutionMs,
          hintsRevealed: s.hintsRevealed,
          solutionRevealed: s.solutionRevealed,
          solvedCaseIds: solvedIds,
          streakCount: streak.count,
        })
        const newBadges = addBadges(earned)
        const levelAfterTitle = levelFor(updatedProgress.totalXp).title
        const questResult = checkQuestCompletion({
          caseId: s.scenario.caseId,
          difficulty: s.scenario.difficulty,
          isReplay: !isFirstSolve,
        })

        const freshToasts: ToastItem[] = []
        const xpBreakdownItems: Array<{ label: string; value: number }> = [
          { label: 'Base', value: xpBreakdown.base },
          ...(xpBreakdown.time > 0 ? [{ label: 'Speed', value: xpBreakdown.time }] : []),
          ...(xpBreakdown.first > 0 ? [{ label: 'First solve', value: xpBreakdown.first }] : []),
          ...(xpBreakdown.soln > 0 ? [{ label: 'No peeking', value: xpBreakdown.soln }] : []),
          ...(xpBreakdown.hint < 0 ? [{ label: 'Hints', value: xpBreakdown.hint }] : []),
        ]
        freshToasts.push({
          id: `xp-${Date.now()}`,
          text: `+${xpBreakdown.total} XP earned`,
          createdAt: Date.now(),
          tone: 'accent',
          breakdown: xpBreakdownItems,
        })
        if (newBest) {
          freshToasts.push({ id: `best-${Date.now()}`, text: `New personal best: ${fmtDuration(resolutionMs)}`, createdAt: Date.now(), tone: 'ok' })
        }
        if (streak.count >= 2) {
          freshToasts.push({ id: `streak-${Date.now()}`, text: `${streak.count}-day streak`, createdAt: Date.now(), tone: 'warn' })
        }
        for (const id of newBadges) {
          freshToasts.push({ id: `badge-${id}-${Date.now()}`, text: `Badge earned: ${BADGE_BY_ID[id].label}`, createdAt: Date.now(), tone: 'ok' })
        }
        if (questResult.completed) {
          freshToasts.push({
            id: `quest-${Date.now()}`,
            text: `Daily quest complete! +${questResult.bonus} XP`,
            createdAt: Date.now(),
            tone: 'ok',
          })
        }
        set((cur) => ({
          submitResult: result,
          solved: true,
          toasts: [...cur.toasts, ...freshToasts],
          celebratingBadges: newBadges.length > 0 ? newBadges : cur.celebratingBadges,
          solveCelebrationKey: cur.solveCelebrationKey + 1,
          lastResolution: {
            xp: xpBreakdown.total,
            streakCount: streak.count,
            badges: newBadges,
            levelBefore: levelBeforeTitle,
            levelAfter: levelAfterTitle,
            leveledUp: levelBeforeTitle !== levelAfterTitle,
            newBest,
            resolutionMs,
          },
        }))
      } else {
        set({ submitResult: result, solved: s.solved || result.passed })
      }
    } finally {
      set({ isSubmitting: false })
    }
  },

  setScrubberT: (t) => set({ scrubberT: t }),
  setPlaying: (p) => set({ playing: p }),

  openContextMenu: (state) => set({ contextMenu: state }),
  closeContextMenu: () => set({ contextMenu: undefined }),

  runTerminalCommand: (nodeId, cmd, output) =>
    set((s) => ({
      terminals: { ...s.terminals, [nodeId]: [...(s.terminals[nodeId] ?? []), { cmd, output }] },
    })),
  clearTerminal: (nodeId) => set((s) => ({ terminals: { ...s.terminals, [nodeId]: [] } })),

  setEditorTheme: (t) => {
    try {
      localStorage.setItem(EDITOR_THEME_KEY, t)
    } catch {
      // ignore
    }
    set({ editorTheme: t })
  },
}))
