import { useSev0Store } from '../store'
import { buildShareUrl, formatResultSummary, downloadTextFile } from './shareUtils'
import { navigate } from '../router'
import { Logo } from './Logo'
import { ElapsedTimer } from './ElapsedTimer'

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded px-1 py-[1px] font-mono text-[9.5px]"
      style={{ background: 'rgba(255,255,255,0.08)', color: 'inherit', opacity: 0.7 }}
    >
      {children}
    </span>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Header() {
  const scenario = useSev0Store((s) => s.scenario)
  const isRunning = useSev0Store((s) => s.isRunning)
  const isSubmitting = useSev0Store((s) => s.isSubmitting)
  const runPractice = useSev0Store((s) => s.runPractice)
  const submit = useSev0Store((s) => s.submit)
  const setTutorialOpen = useSev0Store((s) => s.setTutorialOpen)
  const setCommandPaletteOpen = useSev0Store((s) => s.setCommandPaletteOpen)
  const openContextMenu = useSev0Store((s) => s.openContextMenu)
  const showToast = useSev0Store((s) => s.showToast)

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
      className="flex h-11 shrink-0 items-center justify-between border-b px-3.5"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
    >
      <div className="flex items-center gap-2.5">
        <button onClick={() => navigate('/')} title="Back to open incidents" className="flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="h-3.5 w-px" style={{ background: 'var(--border-strong)' }} />
          <span className="font-mono text-[11px]" style={{ color: 'var(--fg-faint)' }}>
            {scenario.caseId}
          </span>
        </button>
        <span className="h-3.5 w-px" style={{ background: 'var(--border-strong)' }} />
        <ElapsedTimer />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex h-6 items-center gap-2 rounded px-2 font-mono text-[10.5px]"
          style={{ border: '1px solid var(--border-strong)', color: 'var(--fg-faint)', background: 'var(--surface)' }}
        >
          <span>search files &amp; commands</span>
          <Kbd>⌘K</Kbd>
        </button>
        <button
          onClick={openShareMenu}
          className="flex h-6 items-center gap-1.5 rounded px-2 font-mono text-[10.5px]"
          style={{ border: '1px solid var(--border-strong)', color: 'var(--fg-muted)', background: 'var(--surface)' }}
        >
          Share
        </button>
        <button
          onClick={() => setTutorialOpen(true)}
          aria-label="How this works"
          title="How this works"
          className="flex h-6 w-6 items-center justify-center rounded font-mono text-[11px] font-medium"
          style={{ border: '1px solid var(--border-strong)', color: 'var(--fg-muted)', background: 'var(--surface)' }}
        >
          ?
        </button>
        <span className="mx-0.5 h-3.5 w-px" style={{ background: 'var(--border-strong)' }} />
        <button
          onClick={() => runPractice()}
          disabled={isRunning || isSubmitting}
          title="Replay the incident on a seed you can see — instant, free, watch it happen in the timeline below"
          className="flex h-6 items-center gap-1.5 rounded px-2.5 font-mono text-[10.5px] font-medium transition-colors disabled:opacity-50"
          style={{ border: '1px solid var(--border-strong)', color: 'var(--fg)', background: 'var(--surface)' }}
        >
          {isRunning && <Spinner />}
          {isRunning ? 'Replaying…' : 'Run practice seed'}
          {!isRunning && <Kbd>⌘⏎</Kbd>}
        </button>
        <button
          onClick={() => submit()}
          disabled={isRunning || isSubmitting}
          title="Grade your fix against 5 seeds you've never seen — this is what checks whether it actually works"
          className="flex h-6 items-center gap-1.5 rounded px-2.5 font-mono text-[10.5px] font-semibold text-black transition-colors disabled:opacity-50"
          style={{ background: '#fff' }}
        >
          {isSubmitting && <Spinner />}
          {isSubmitting ? 'Grading…' : 'Submit'}
          {!isSubmitting && <Kbd>⇧⌘⏎</Kbd>}
        </button>
      </div>
    </header>
  )
}
