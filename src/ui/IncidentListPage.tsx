import { SCENARIOS } from '../scenario/scenarios'
import { navigate } from '../router'
import { Logo } from './Logo'

const SEVERITY_COLOR: Record<string, string> = {
  SEV0: 'var(--crit)',
  SEV1: 'var(--warn)',
  SEV2: 'var(--fg-muted)',
}

function IncidentCard({ scenario }: { scenario: (typeof SCENARIOS)[number] }) {
  return (
    <button
      onClick={() => navigate(`/incident/${scenario.caseId}`)}
      className="group flex w-full flex-col gap-2.5 rounded-lg border p-5 text-left transition-colors"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide"
          style={{ background: 'var(--accent-dim)', color: SEVERITY_COLOR[scenario.severity] }}
        >
          {scenario.severity}
        </span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--fg-faint)' }}>
          {scenario.caseId}
        </span>
      </div>
      <h2 className="text-[15px] font-semibold leading-snug" style={{ letterSpacing: '-0.005em' }}>
        {scenario.displayTitle}
      </h2>
      <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        {scenario.incidentReport[0]}
      </p>
      <div className="mt-1 flex items-center gap-3 font-mono text-[10.5px]" style={{ color: 'var(--fg-faint)' }}>
        <span>{scenario.editableFiles.length} editable file{scenario.editableFiles.length === 1 ? '' : 's'}</span>
        <span>·</span>
        <span>{scenario.hiddenSeeds.length} hidden seeds</span>
        <span>·</span>
        <span>{Math.round(scenario.timeLimitMs / 60000)} min budget</span>
        <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--accent)' }}>
          open →
        </span>
      </div>
    </button>
  )
}

export function IncidentListPage() {
  return (
    <div className="flex h-full flex-col items-center overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[720px] px-6 py-14">
        <div className="mb-8">
          <Logo />
        </div>

        <h1 className="mb-1.5 text-[22px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
          Open incidents
        </h1>
        <p className="mb-8 max-w-[56ch] text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          Each one is a real running system with a defect somewhere in it. Pick one, read the incident, find
          what&rsquo;s wrong, and submit a fix that survives seeds you&rsquo;ve never seen.
        </p>

        <div className="flex flex-col gap-3">
          {SCENARIOS.map((s) => (
            <IncidentCard key={s.caseId} scenario={s} />
          ))}
        </div>
      </div>
    </div>
  )
}
