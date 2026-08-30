import { SCENARIOS } from '../scenario/scenarios'
import { navigate } from '../router'
import { Logo } from './Logo'
import { DIFFICULTY_LABEL, DIFFICULTY_COLOR } from './difficulty'
import { isScenarioSolved, rankFor } from '../progress'

const SEVERITY_COLOR: Record<string, string> = {
  SEV0: 'var(--crit)',
  SEV1: 'var(--warn)',
  SEV2: 'var(--fg-muted)',
}

function Badge({ color, outline, children }: { color: string; outline?: boolean; children: React.ReactNode }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide"
      style={outline ? { background: 'var(--surface)', border: `1px solid ${color}`, color } : { background: 'var(--accent-dim)', color }}
    >
      {children}
    </span>
  )
}

function IncidentCard({ scenario }: { scenario: (typeof SCENARIOS)[number] }) {
  const solved = isScenarioSolved(scenario)
  return (
    <button
      onClick={() => navigate(`/incident/${scenario.caseId}`)}
      className="group relative flex w-full flex-col gap-2.5 rounded-lg border p-5 text-left transition-all duration-150 hover:-translate-y-0.5"
      style={{
        borderColor: solved ? 'var(--ok)' : 'var(--border)',
        background: 'var(--surface)',
        boxShadow: solved ? '0 0 0 1px rgba(69,179,107,0.15)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!solved) e.currentTarget.style.borderColor = 'var(--border-strong)'
        e.currentTarget.style.boxShadow = solved ? '0 8px 24px rgba(69,179,107,0.12)' : '0 8px 24px rgba(0,0,0,0.35)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = solved ? 'var(--ok)' : 'var(--border)'
        e.currentTarget.style.boxShadow = solved ? '0 0 0 1px rgba(69,179,107,0.15)' : 'none'
      }}
    >
      <div className="flex items-center gap-2">
        <Badge color={SEVERITY_COLOR[scenario.severity]}>{scenario.severity}</Badge>
        <Badge color={DIFFICULTY_COLOR[scenario.difficulty]} outline>
          {DIFFICULTY_LABEL[scenario.difficulty]}
        </Badge>
        {solved && <Badge color="var(--ok)">resolved</Badge>}
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
        <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" style={{ color: solved ? 'var(--ok)' : 'var(--accent)' }}>
          {solved ? 'reopen →' : 'open →'}
        </span>
      </div>
    </button>
  )
}

export function IncidentListPage() {
  const solvedCount = SCENARIOS.filter(isScenarioSolved).length
  const total = SCENARIOS.length
  const rank = rankFor(solvedCount, total)
  const pct = total > 0 ? Math.round((solvedCount / total) * 100) : 0

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[720px] px-6 py-14">
        <div className="mb-6">
          <Logo />
        </div>

        <h1 className="mb-1.5 text-[24px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
          Open incidents
        </h1>
        <p className="mb-1 max-w-[58ch] text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          A flight simulator for production. You don&rsquo;t fly the plane — you&rsquo;re handed one that&rsquo;s
          already on fire. Pick an incident, read the signals, find what&rsquo;s actually wrong, and prove your fix
          holds on seeds you&rsquo;ve never seen.
        </p>
        <p className="mb-7 max-w-[58ch] text-[12px] leading-relaxed" style={{ color: 'var(--fg-faint)' }}>
          No real customers were harmed in the making of these outages.
        </p>

        <div className="mb-8 rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold" style={{ color: 'var(--fg)' }}>
              {rank}
            </span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--fg-faint)' }}>
              {solvedCount} / {total} resolved
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: pct === 100 ? 'var(--ok)' : 'var(--accent)' }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {SCENARIOS.map((s) => (
            <IncidentCard key={s.caseId} scenario={s} />
          ))}
        </div>

        {solvedCount === total && total > 0 && (
          <p className="mt-6 text-center font-mono text-[11.5px]" style={{ color: 'var(--ok)' }}>
            Every open incident is resolved. On-call is quiet — for now.
          </p>
        )}
      </div>
    </div>
  )
}
