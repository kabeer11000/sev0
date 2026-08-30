import { useEffect, useState } from 'react'
import { useSev0Store } from '../store'
import { buildShareUrl, formatResultSummary, downloadTextFile } from './shareUtils'
import { navigate } from '../router'
import { Logo } from './Logo'
import { ElapsedTimer } from './ElapsedTimer'
import { AccountMenu } from './AccountMenu'
import { HeaderProgress } from './HeaderProgress'
import { XpPotentialPill } from './XpPotentialPill'
import { PracticeStats } from './PracticeStats'
import { getPracticeRunCount } from '../practiceStats'

function Spinner() {
  return (
    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function RestartIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 8 A 5.5 5.5 0 1 1 8 13.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M5.5 1.5 L 2.5 1.5 L 2.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function RestartButton() {
  const restartIncident = useSev0Store((s) => s.restartIncident)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const id = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(id)
  }, [confirming])

  return (
    <button
      onClick={() => {
        if (confirming) {
          restartIncident()
          setConfirming(false)
        } else {
          setConfirming(true)
        }
      }}
      title="Restart this incident — clears your code, hints, and timer"
      className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
      style={{
        border: '1px solid var(--border)',
        color: confirming ? 'var(--crit)' : 'var(--fg-muted)',
        background: confirming ? 'var(--crit-bg)' : 'var(--surface)',
      }}
    >
      <RestartIcon />
      {confirming ? 'Confirm restart?' : 'Restart'}
    </button>
  )
}

export function Header() {
  const scenario = useSev0Store((s) => s.scenario)
  const isRunning = useSev0Store((s) => s.isRunning)
  const isSubmitting = useSev0Store((s) => s.isSubmitting)
  const runPractice = useSev0Store((s) => s.runPractice)
  const submit = useSev0Store((s) => s.submit)
  const setCommandPaletteOpen = useSev0Store((s) => s.setCommandPaletteOpen)
  const openContextMenu = useSev0Store((s) => s.openContextMenu)
  const showToast = useSev0Store((s) => s.showToast)

  const [runCount, setRunCount] = useState(() => getPracticeRunCount(scenario))
  useEffect(() => {
    setRunCount(getPracticeRunCount(scenario))
    const id = setInterval(() => setRunCount(getPracticeRunCount(scenario)), 1500)
    return () => clearInterval(id)
  }, [scenario])

  const openShareMenu = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const { code, lastRun, submitResult } = useSev0Store.getState()
    openContextMenu({
      x: rect.right - 200,
      y: rect.bottom + 6,
      items: [
        {
          label: 'Copy shareable link (your code)',
          onClick: async () => {
            await navigator.clipboard?.writeText(buildShareUrl(code))
            showToast('Link copied — opening it loads this exact code')
          },
        },
        {
          label: 'Copy result summary',
          onClick: async () => {
            await navigator.clipboard?.writeText(formatResultSummary(scenario.caseId, lastRun, submitResult))
            showToast('Result summary copied')
          },
        },
        {
          label: 'Download my code',
          separatorBefore: true,
          onClick: () => {
            const names: string[] = []
            for (const path of scenario.editableFiles.map((f) => `services/${f.path}`)) {
              const content = code[path]
              if (content == null) continue
              const name = path.split('/').pop() ?? path
              downloadTextFile(name, content)
              names.push(name)
            }
            showToast(`Downloaded ${names.join(', ')}`)
          },
        },
      ],
    })
  }

  return (
    <header
      className="flex h-12 shrink-0 items-center justify-between border-b px-4"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
    >
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => navigate('/')}
          title="Back to open incidents"
          className="group flex items-center gap-2 rounded-full transition-all duration-200 hover:-translate-y-px"
        >
          <Logo size="sm" />
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold tracking-wide transition-colors group-hover:bg-[var(--surface-hover)]"
            style={{ background: 'var(--surface)', color: 'var(--fg-muted)' }}
          >
            {scenario.caseId}
          </span>
        </button>
        <ElapsedTimer />
        <HeaderProgress />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search files and commands"
          title="Search files & commands (⌘K)"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
          style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)', background: 'var(--surface)' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.5 10.5 L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={openShareMenu}
          className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
          style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)', background: 'var(--surface)' }}
        >
          Share
        </button>
        <PracticeStats />
        <RestartButton />
        <div className="relative">
          <button
            onClick={() => runPractice()}
            disabled={isRunning || isSubmitting}
            title="Replay the incident on a seed you can see — instant, free, watch it happen in the timeline below (⌘⏎)"
            className="flex h-8 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
            style={{
              background: 'linear-gradient(180deg, #f7c8b3 0%, var(--accent-dim) 100%)',
              color: 'var(--accent-strong)',
              border: '1px solid #f1b097',
            }}
          >
            {isRunning && <Spinner />}
            {isRunning ? 'Running…' : 'Run'}
          </button>
          {runCount > 0 && !isRunning && (
            <span
              aria-label={`${runCount} practice runs so far`}
              className="pop-in pointer-events-none absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold tabular-nums"
              style={{
                background: 'var(--accent-strong)',
                color: '#fff',
                border: '2px solid var(--bg-elevated)',
                boxShadow: '0 2px 6px rgba(196, 85, 47, 0.32)',
              }}
            >
              {runCount}
            </span>
          )}
        </div>
        <XpPotentialPill />
        <button
          onClick={() => submit()}
          disabled={isRunning || isSubmitting}
          title="Grade your fix against 5 seeds you've never seen — this is what checks whether it actually works (⇧⌘⏎)"
          className="pulse-ring flex h-8 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-lg active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
          style={{
            background: 'linear-gradient(180deg, #f37c5a 0%, var(--accent) 60%, var(--accent-strong) 100%)',
            boxShadow: '0 4px 14px rgba(238, 90, 54, 0.30)',
          }}
        >
          {isSubmitting && <Spinner />}
          {isSubmitting ? 'Grading…' : 'Submit'}
        </button>
        <AccountMenu />
      </div>
    </header>
  )
}
