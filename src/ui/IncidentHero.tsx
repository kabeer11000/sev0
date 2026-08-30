import type { Scenario } from '../scenario/types'

interface Props {
  scenario: Scenario
  solved: boolean
  xpReward: number
}

const SEVERITY_BG: Record<string, string> = {
  SEV0: '#fadcd6',
  SEV1: '#fbecd0',
  SEV2: '#f3ede4',
}

const SEVERITY_FG: Record<string, string> = {
  SEV0: '#b03328',
  SEV1: '#a96d10',
  SEV2: '#6b6053',
}

const SEVERITY_GLYPH: Record<string, string> = {
  SEV0: 'M12 2 L 22 21 L 2 21 Z M12 10 L 12 15 M12 17.5 L 12 18.5',
  SEV1: 'M12 7 L 12 13 M12 16 L 12 17',
  SEV2: 'M5 12 L 19 12',
}

function SeverityGlyph({ sev }: { sev: string }) {
  const path = SEVERITY_GLYPH[sev] ?? SEVERITY_GLYPH.SEV2!
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path} />
    </svg>
  )
}

export function IncidentHero({ scenario, solved, xpReward }: Props) {
  const bg = SEVERITY_BG[scenario.severity] ?? SEVERITY_BG.SEV2!
  const fg = SEVERITY_FG[scenario.severity] ?? SEVERITY_FG.SEV2!
  return (
    <div
      className="pop-in mb-5 flex items-center gap-4 rounded-3xl px-5 py-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: bg, color: fg, border: '1px solid rgba(43,36,28,0.06)' }}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.55)' }}>
        <SeverityGlyph sev={scenario.severity} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ letterSpacing: '0.08em' }}>
          {scenario.severity} · active incident
        </span>
        <span className="truncate text-[16px] font-semibold" style={{ color: 'var(--fg)', letterSpacing: '-0.005em' }}>
          {scenario.displayTitle}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[12px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.65)', color: 'var(--accent-strong)' }}
          title="XP reward for solving this incident"
        >
          {xpReward} XP
        </span>
        {solved && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--ok)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12 L 10 17 L 19 7" />
            </svg>
            Resolved
          </span>
        )}
      </div>
    </div>
  )
}