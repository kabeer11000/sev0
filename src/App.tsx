import { useEffect, useState } from 'react'
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
import { Confetti } from './ui/Confetti'
import { BadgeCelebrationModal } from './ui/BadgeCelebrationModal'
import { XpCoinFloater } from './ui/XpCoinFloater'
import { IncidentListPage } from './ui/IncidentListPage'
import { LeaderboardPage } from './ui/LeaderboardPage'
import { NotFoundPage } from './ui/NotFoundPage'

function ResizeHandle({ direction }: { direction: 'horizontal' | 'vertical' }) {
  const isH = direction === 'horizontal'
  return (
    <PanelResizeHandle
      className="group relative shrink-0"
      style={isH ? { width: 10, cursor: 'col-resize' } : { height: 10, cursor: 'row-resize' }}
    >
      <div
        className="absolute transition-colors group-hover:bg-[var(--accent)] group-data-[resize-handle-active]:bg-[var(--accent)]"
        style={
          isH
            ? { left: 4, top: 0, bottom: 0, width: 2, background: 'var(--border)' }
            : { top: 4, left: 0, right: 0, height: 2, background: 'var(--border)' }
        }
      />
      {/* grip dots — visible on hover, oriented to direction */}
      <div
        className="absolute flex items-center justify-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-data-[resize-handle-active]:opacity-100"
        style={
          isH
            ? { left: 1, top: '50%', transform: 'translateY(-50%)', flexDirection: 'column' }
            : { top: 1, left: '50%', transform: 'translateX(-50%)', flexDirection: 'row' }
        }
      >
        <span className="h-0.5 w-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="h-0.5 w-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="h-0.5 w-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
      </div>
    </PanelResizeHandle>
  )
}

function PanelLabel({
  children,
  icon,
  accent,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className="flex h-9 shrink-0 items-center gap-1.5 border-b px-4 text-[12px] font-semibold"
      style={{
        borderColor: 'var(--border)',
        color: accent ? 'var(--accent-strong)' : 'var(--fg-muted)',
        background: 'transparent',
      }}
    >
      {icon}
      {children}
    </div>
  )
}

function PanelIcon({ kind }: { kind: 'topology' | 'files' | 'verdict' | 'timeline' | 'events' }) {
  const stroke = 'currentColor'
  switch (kind) {
    case 'topology':
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="3" cy="3" r="1.8" stroke={stroke} strokeWidth="1.4" />
          <circle cx="13" cy="4" r="1.8" stroke={stroke} strokeWidth="1.4" />
          <circle cx="8" cy="13" r="1.8" stroke={stroke} strokeWidth="1.4" />
          <path d="M4.5 4 L11.5 4.5 M4 4.5 L7.5 11.5 M11 5.5 L9 11.5" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        </svg>
      )
    case 'files':
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3 2 H9 L13 6 V14 H3 Z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M9 2 V6 H13" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" opacity="0.6" />
        </svg>
      )
    case 'verdict':
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="6" stroke={stroke} strokeWidth="1.4" />
          <path d="M5 8.5 L7 10.5 L11 6" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'timeline':
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="3" cy="8" r="1.6" stroke={stroke} strokeWidth="1.4" />
          <circle cx="13" cy="8" r="1.6" stroke={stroke} strokeWidth="1.4" />
          <path d="M4.5 8 L11.5 8" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case 'events':
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="2.5" y="3" width="11" height="2" rx="0.6" stroke={stroke} strokeWidth="1.2" />
          <rect x="2.5" y="7" width="11" height="2" rx="0.6" stroke={stroke} strokeWidth="1.2" />
          <rect x="2.5" y="11" width="11" height="2" rx="0.6" stroke={stroke} strokeWidth="1.2" />
        </svg>
      )
  }
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
    <div
      className="flex h-10 shrink-0 items-end gap-1 overflow-x-auto overflow-y-hidden px-2"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      {tabs.map((t) => {
        const active = activeId === t.id
        const dirty = isDirty(t.id)
        return (
          <div
            key={t.id}
            className="group relative flex h-8 shrink-0 items-center gap-1.5 self-end rounded-t-xl px-3.5 text-[12.5px] transition-all duration-200"
            style={{
              background: active ? 'var(--bg-elevated)' : 'transparent',
              color: active ? 'var(--fg)' : 'var(--fg-faint)',
              boxShadow: active ? '0 -2px 8px rgba(43, 36, 28, 0.06)' : 'none',
              border: active ? '1px solid var(--border)' : '1px solid transparent',
              borderBottom: active ? '1px solid var(--bg-elevated)' : '1px solid transparent',
              marginBottom: '-1px',
            }}
          >
            <button
              onClick={() => setActive(t.id)}
              className="flex h-full items-center gap-2 font-medium transition-colors group-hover:text-[var(--fg-muted)]"
              style={{ color: 'inherit' }}
            >
              {labelFor(t.id)}
              {dirty && (
                <span
                  className="dirty-pulse relative flex h-2 w-2"
                  title="Unsaved changes"
                >
                  <span className="absolute inset-0 rounded-full" style={{ background: 'var(--accent)' }} />
                </span>
              )}
            </button>
            {t.id !== 'incident' && t.id !== 'docs' && t.id !== 'hints' && (
              <button
                onClick={() => closeTab(t.id)}
                className="flex h-4 w-4 items-center justify-center rounded-md opacity-0 transition-all duration-150 hover:bg-[var(--surface-hover)] group-hover:opacity-100"
                style={{ color: 'var(--fg-faint)' }}
                aria-label="Close tab"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BottomTabBar() {
  const tabs = useSev0Store((s) => s.bottomTabs)
  const activeId = useSev0Store((s) => s.activeBottomTabId)
  const setActive = useSev0Store((s) => s.setActiveBottomTab)
  const closeTab = useSev0Store((s) => s.closeBottomTab)

  return (
    <div
      className="flex h-10 shrink-0 items-end gap-1 overflow-x-auto overflow-y-hidden px-2"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      {tabs.map((t) => {
        const active = activeId === t.id
        return (
          <div
            key={t.id}
            className="group relative flex h-8 shrink-0 items-center gap-2 self-end rounded-t-xl px-3.5 text-[12.5px] transition-all duration-200"
            style={{
              background: active ? 'var(--bg-elevated)' : 'transparent',
              color: active ? 'var(--fg)' : 'var(--fg-faint)',
              boxShadow: active ? '0 -2px 8px rgba(43, 36, 28, 0.06)' : 'none',
              border: active ? '1px solid var(--border)' : '1px solid transparent',
              borderBottom: active ? '1px solid var(--bg-elevated)' : '1px solid transparent',
              marginBottom: '-1px',
            }}
          >
            <button
              onClick={() => setActive(t.id)}
              className="flex h-full items-center gap-1.5 font-medium transition-colors group-hover:text-[var(--fg-muted)]"
              style={{ color: 'inherit' }}
            >
              {t.kind === 'feed' ? 'Event feed' : t.nodeId}
            </button>
            {t.id !== 'feed' && (
              <button
                onClick={() => closeTab(t.id)}
                className="flex h-4 w-4 items-center justify-center rounded-md opacity-0 transition-all duration-150 hover:bg-[var(--surface-hover)] group-hover:opacity-100"
                style={{ color: 'var(--fg-faint)' }}
                aria-label="Close tab"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )
      })}
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
  const celebratingBadges = useSev0Store((s) => s.celebratingBadges)
  const dismissCelebration = useSev0Store((s) => s.dismissCelebration)
  const solveCelebrationKey = useSev0Store((s) => s.solveCelebrationKey)
  const lastResolution = useSev0Store((s) => s.lastResolution)
  const [confettiKey, setConfettiKey] = useState(0)

  useEffect(() => {
    if (solveCelebrationKey > 0) setConfettiKey((k) => k + 1)
  }, [solveCelebrationKey])

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
      {confettiKey > 0 && <Confetti key={confettiKey} />}
      <XpCoinFloater trigger={solveCelebrationKey} amount={lastResolution?.xp ?? 0} />
      {celebratingBadges.length > 0 && (
        <BadgeCelebrationModal badges={celebratingBadges} onClose={dismissCelebration} />
      )}
      <Header />

      <PanelGroup direction="vertical" className="min-h-0 flex-1">
        <Panel defaultSize={72} minSize={35}>
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={28} minSize={18} maxSize={48}>
              <PanelGroup direction="vertical" className="h-full border-r" style={{ borderColor: 'var(--border)' }}>
                <Panel defaultSize={65} minSize={25}>
                  <div className="flex h-full flex-col">
                    <PanelLabel icon={<PanelIcon kind="topology" />}>Topology</PanelLabel>
                    <div className="min-h-0 flex-1">
                      <TopologyGraph scenario={storeScenario} log={lastRun?.log} t={scrubberT} />
                    </div>
                    <TopologyLegend />
                  </div>
                </Panel>
                <ResizeHandle direction="vertical" />
                <Panel defaultSize={35} minSize={15}>
                  <div className="flex h-full flex-col">
                    <PanelLabel icon={<PanelIcon kind="files" />}>Files</PanelLabel>
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
                <PanelLabel icon={<PanelIcon kind="verdict" />} accent>Verdict</PanelLabel>
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
  if (route.type === 'leaderboard') return <LeaderboardPage />

  const scenario = getScenarioByCaseId(route.caseId)
  if (!scenario) return <NotFoundPage caseId={route.caseId} />

  return <IncidentApp scenario={scenario} />
}
