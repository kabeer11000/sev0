import { create } from 'zustand'
import type { Scenario } from './scenario/types'
import { checkoutScenario } from './scenario/checkout'
import { getScenarioByCaseId } from './scenario/scenarios'
import { buildFilesystem, buildIotFilesystem } from './scenario/filesystem'
import type { FsFile } from './scenario/filesystem'
import { runScenario, submitScenario } from './runner'
import type { RunResult, SubmitResult } from './runner'
import { runIotScenario, submitIotScenario } from './iotRunner'
import type { IotRunResult, IotSubmitResult } from './iotRunner'
import { readSharedSolutionFromHash, clearShareHash } from './ui/shareUtils'
import { parseRoute } from './router'

function lastEditableVfsPath(scenario: Scenario): string {
  return `services/${scenario.editableFiles[scenario.editableFiles.length - 1].path}`
}

export type CenterTab =
  | { id: 'incident'; kind: 'incident' }
  | { id: 'docs'; kind: 'docs' }
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

const TUTORIAL_SEEN_KEY = 'sev0_tutorial_seen'

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
  return checkoutScenario
}

interface ScenarioLoad {
  scenario: Scenario
  filesystem: FsFile[]
  code: Record<string, string>
  taskStartedAt: number
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
    toast: sharedCode ? "Loaded a shared solution — this is someone else's code, not the starter" : undefined,
  }
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

  isRunning: boolean
  isSubmitting: boolean
  lastRun?: RunResult | IotRunResult
  submitResult?: SubmitResult | IotSubmitResult
  scrubberT: number
  playing: boolean
  tutorialOpen: boolean
  commandPaletteOpen: boolean
  toast?: string

  contextMenu?: ContextMenuState

  loadScenario: (scenario: Scenario) => void
  setTutorialOpen: (v: boolean) => void
  setCommandPaletteOpen: (v: boolean) => void
  showToast: (msg: string) => void
  clearToast: () => void
  openFile: (path: string) => void
  openIncident: () => void
  openDocs: () => void
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
  ],
  activeCenterTabId: initialLoad.toast ? `file:${lastEditableVfsPath(initialLoad.scenario)}` : 'incident',
  bottomTabs: [{ id: 'feed', kind: 'feed' }],
  activeBottomTabId: 'feed',
  terminals: {},
  taskStartedAt: initialLoad.taskStartedAt,

  isRunning: false,
  isSubmitting: false,
  lastRun: undefined,
  submitResult: undefined,
  scrubberT: 0,
  playing: false,
  tutorialOpen: !hasSeenTutorial() && !initialLoad.toast,
  commandPaletteOpen: false,
  toast: initialLoad.toast,
  contextMenu: undefined,

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
      ],
      activeCenterTabId: loaded.toast ? `file:${lastEditableVfsPath(loaded.scenario)}` : 'incident',
      bottomTabs: [{ id: 'feed', kind: 'feed' }],
      activeBottomTabId: 'feed',
      terminals: {},
      taskStartedAt: loaded.taskStartedAt,
      lastRun: undefined,
      submitResult: undefined,
      scrubberT: 0,
      playing: false,
      toast: loaded.toast,
    })
  },

  setTutorialOpen: (v) => {
    if (!v) markTutorialSeen()
    set({ tutorialOpen: v })
  },
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  showToast: (msg) => set({ toast: msg }),
  clearToast: () => set({ toast: undefined }),

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

  closeCenterTab: (id) =>
    set((s) => {
      if (id === 'incident' || id === 'docs') return {}
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
      set({ submitResult: result })
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
}))
