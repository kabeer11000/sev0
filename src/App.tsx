import { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useSev0Store } from './store'
import type { Scenario } from './scenario/types'
import { getScenarioByCaseId } from './scenario/scenarios'
import { useRoute } from './router'
import { Header } from './ui/Header'
import { TopologyGraph } from './ui/TopologyGraph'
import { TopologyLegend } from './ui/TopologyLegend'
import { FileTree } from './ui/FileTree'
import { IncidentPanel } from './ui/IncidentPanel'
import { SdkReferencePanel } from './ui/SdkReferencePanel'
import { HintsPanel } from './ui/HintsPanel'
import { FileViewer } from './ui/FileViewer'
import { VerdictPanel } from './ui/VerdictPanel'
import { Timeline } from './ui/Timeline'
import { EventFeed } from './ui/EventFeed'
import { Terminal } from './ui/Terminal'
import { TutorialModal } from './ui/TutorialModal'
import { ContextMenu } from './ui/ContextMenu'
import { CommandPalette } from './ui/CommandPalette'
import { Toast } from './ui/Toast'
import { IncidentListPage } from './ui/IncidentListPage'
import { NotFoundPage } from './ui/NotFoundPage'

function ResizeHandle({ direction }: { direction: 'horizontal' | 'vertical' }) {
  return (
    <PanelResizeHandle
      className="group relative shrink-0"
      style={direction === 'horizontal' ? { width: 9, cursor: 'col-resize' } : { height: 9, cursor: 'row-resize' }}
    >
      <div
        className="absolute transition-colors group-hover:bg-[var(--accent)] group-data-[resize-handle-active]:bg-[var(--accent)]"
        style={
          direction === 'horizontal'
            ? { left: 4, top: 0, bottom: 0, width: 1, background: 'var(--border)' }
            : { top: 4, left: 0, right: 0, height: 1, background: 'var(--border)' }
        }
      />
    </PanelResizeHandle>
  )
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-8 shrink-0 items-center border-b px-3 font-mono text-[10px] uppercase tracking-wider"
      style={{ borderColor: 'var(--border)', color: 'var(--fg-faint)' }}
    >
      {children}
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9">
      <path d="M0.5,0.5 L8.5,8.5 M8.5,0.5 L0.5,8.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function CenterTabBar() {
  const tabs = useSev0Store((s) => s.centerTabs)
  const activeId = useSev0Store((s) => s.activeCenterTabId)
  const setActive = useSev0Store((s) => s.setActiveCenterTab)
  const closeTab = useSev0Store((s) => s.closeCenterTab)
  const code = useSev0Store((s) => s.code)
  const filesystem = useSev0Store((s) => s.filesystem)

  const labelFor = (id: string) => {
    if (id === 'incident') return 'Incident'
    if (id === 'docs') return 'Docs'
    if (id === 'hints') return 'Hints'
    const path = id.slice('file:'.length)
    return path.split('/').pop() ?? path
  }
  const isDirty = (id: string) => {
    if (id === 'incident' || id === 'docs' || id === 'hints') return false
    const path = id.slice('file:'.length)
    const f = filesystem.find((x) => x.path === path)
    return !!f?.editable && code[path] !== f.content
  }

  return (
    <div className="flex h-9 shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b" style={{ borderColor: 'var(--border)' }}>
      {tabs.map((t) => (
        <div
          key={t.id}
          className="group relative flex shrink-0 items-center gap-2 border-r px-3 font-mono text-[11.5px]"
          style={{ borderColor: 'var(--border)', color: activeId === t.id ? 'var(--fg)' : 'var(--fg-faint)' }}
        >
          <button onClick={() => setActive(t.id)} className="flex h-9 items-center gap-1.5">
            {labelFor(t.id)}
            {isDirty(t.id) && <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />}
          </button>
          {t.id !== 'incident' && t.id !== 'docs' && t.id !== 'hints' && (
            <button
              onClick={() => closeTab(t.id)}
              className="rounded p-0.5 opacity-0 group-hover:opacity-100"
              style={{ color: 'var(--fg-faint)' }}
              aria-label="Close tab"
            >
              <CloseIcon />
            </button>
          )}
          {activeId === t.id && <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: 'var(--accent)' }} />}
        </div>
      ))}
    </div>
  )
}

function BottomTabBar() {
  const tabs = useSev0Store((s) => s.bottomTabs)
  const activeId = useSev0Store((s) => s.activeBottomTabId)
  const setActive = useSev0Store((s) => s.setActiveBottomTab)
  const closeTab = useSev0Store((s) => s.closeBottomTab)

  return (
    <div className="flex h-8 shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b" style={{ borderColor: 'var(--border)' }}>
      {tabs.map((t) => (
        <div
          key={t.id}
          className="group relative flex shrink-0 items-center gap-2 border-r px-3 font-mono text-[11px]"
          style={{ borderColor: 'var(--border)', color: activeId === t.id ? 'var(--fg)' : 'var(--fg-faint)' }}
        >
          <button onClick={() => setActive(t.id)} className="flex h-8 items-center">
            {t.kind === 'feed' ? 'Feed' : t.nodeId}
          </button>
          {t.id !== 'feed' && (
            <button
              onClick={() => closeTab(t.id)}
              className="rounded p-0.5 opacity-0 group-hover:opacity-100"
              style={{ color: 'var(--fg-faint)' }}
              aria-label="Close tab"
            >
              <CloseIcon />
            </button>
          )}
          {activeId === t.id && <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: 'var(--accent)' }} />}
        </div>
      ))}
    </div>
  )
}

function IncidentApp({ scenario }: { scenario: Scenario }) {
  const activeCenterTabId = useSev0Store((s) => s.activeCenterTabId)
  const activeBottomTabId = useSev0Store((s) => s.activeBottomTabId)
  const storeScenario = useSev0Store((s) => s.scenario)
  const loadScenario = useSev0Store((s) => s.loadScenario)
  const lastRun = useSev0Store((s) => s.lastRun)
  const scrubberT = useSev0Store((s) => s.scrubberT)
  const tutorialOpen = useSev0Store((s) => s.tutorialOpen)
  const setTutorialOpen = useSev0Store((s) => s.setTutorialOpen)
  const setCommandPaletteOpen = useSev0Store((s) => s.setCommandPaletteOpen)
  const runPractice = useSev0Store((s) => s.runPractice)
  const submit = useSev0Store((s) => s.submit)

  useEffect(() => {
    if (storeScenario.caseId !== scenario.caseId) loadScenario(scenario)
  }, [scenario, storeScenario.caseId, loadScenario])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      if (meta && e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) void submit()
        else void runPractice()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setCommandPaletteOpen, runPractice, submit])

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg)' }}>
      {tutorialOpen && <TutorialModal onClose={() => setTutorialOpen(false)} />}
      <CommandPalette />
      <Toast />
      <ContextMenu />
      <Header />

      <PanelGroup direction="vertical" className="min-h-0 flex-1">
        <Panel defaultSize={72} minSize={35}>
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={28} minSize={18} maxSize={48}>
              <PanelGroup direction="vertical" className="h-full border-r" style={{ borderColor: 'var(--border)' }}>
                <Panel defaultSize={65} minSize={25}>
                  <div className="flex h-full flex-col">
                    <PanelLabel>Topology</PanelLabel>
                    <div className="min-h-0 flex-1">
                      <TopologyGraph scenario={storeScenario} log={lastRun?.log} t={scrubberT} />
                    </div>
                    <TopologyLegend />
                  </div>
                </Panel>
                <ResizeHandle direction="vertical" />
                <Panel defaultSize={35} minSize={15}>
                  <div className="flex h-full flex-col">
                    <PanelLabel>Files</PanelLabel>
                    <div className="min-h-0 flex-1">
                      <FileTree />
                    </div>
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>

            <ResizeHandle direction="horizontal" />

            <Panel defaultSize={55} minSize={30}>
              <main className="flex h-full min-w-0 flex-col border-r" style={{ borderColor: 'var(--border)' }}>
                <CenterTabBar />
                <div className="min-h-0 flex-1">
                  {activeCenterTabId === 'incident' ? (
                    <IncidentPanel />
                  ) : activeCenterTabId === 'docs' ? (
                    <SdkReferencePanel />
                  ) : activeCenterTabId === 'hints' ? (
                    <HintsPanel />
                  ) : (
                    <FileViewer key={activeCenterTabId} path={activeCenterTabId.slice('file:'.length)} />
                  )}
                </div>
              </main>
            </Panel>

            <ResizeHandle direction="horizontal" />

            <Panel defaultSize={25} minSize={16} maxSize={40}>
              <aside className="flex h-full flex-col">
                <PanelLabel>Verdict</PanelLabel>
                <div className="min-h-0 flex-1">
                  <VerdictPanel />
                </div>
              </aside>
            </Panel>
          </PanelGroup>
        </Panel>

        <ResizeHandle direction="vertical" />

        <Panel defaultSize={28} minSize={12} maxSize={60}>
          <div className="flex h-full flex-col border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="h-12 shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
              <Timeline />
            </div>
            <BottomTabBar />
            <div className="min-h-0 flex-1">
              {activeBottomTabId === 'feed' ? (
                <EventFeed />
              ) : (
                <Terminal key={activeBottomTabId} nodeId={activeBottomTabId.slice('terminal:'.length)} />
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}

export default function AppRoot() {
  const route = useRoute()

  if (route.type === 'list') return <IncidentListPage />

  const scenario = getScenarioByCaseId(route.caseId)
  if (!scenario) return <NotFoundPage caseId={route.caseId} />

  return <IncidentApp scenario={scenario} />
}
