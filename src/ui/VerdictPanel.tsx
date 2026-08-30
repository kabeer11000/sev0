import { Fragment } from 'react'
import { useSev0Store } from '../store'
import { navigate } from '../router'
import { SCENARIOS } from '../scenario/scenarios'
import { isScenarioSolved, rankFor } from '../progress'

function Chip({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide"
      style={{
        background: ok ? 'var(--ok-bg)' : 'var(--crit-bg)',
        color: ok ? 'var(--ok)' : 'var(--crit)',
      }}
    >
      {ok ? 'pass' : 'fail'}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="px-4 pt-3 pb-2 font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>
        {title}
      </div>
      <div className="px-4 pb-3">{children}</div>
    </div>
  )
}

export function VerdictPanel() {
  const lastRun = useSev0Store((s) => s.lastRun)
  const submitResult = useSev0Store((s) => s.submitResult)
  const scenario = useSev0Store((s) => s.scenario)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {!lastRun && (
        <div className="px-4 py-6 text-xs leading-relaxed" style={{ color: 'var(--fg-faint)' }}>
          Run the practice seed to see invariant results here. Submitting grades your fix against{' '}
          {scenario.hiddenSeeds.length} hidden seeds you haven&rsquo;t seen.
        </div>
      )}

      {lastRun?.error && (
        <Section title="Compile error">
          <pre className="whitespace-pre-wrap font-mono text-[11px]" style={{ color: 'var(--crit)' }}>
            {lastRun.error}
          </pre>
        </Section>
      )}

      {lastRun && !lastRun.error && (
        <>
          <Section title={`Invariants — practice seed ${lastRun.seed}`}>
            <div className="flex flex-col gap-2.5">
              {lastRun.oracle.results.map((r) => (
                <div key={r.key} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px]" style={{ color: 'var(--fg)' }}>
                      {r.title}
                    </span>
                    <Chip ok={r.passed} />
                  </div>
                  <span className="font-mono text-[10.5px]" style={{ color: 'var(--fg-muted)' }}>
                    {r.detail}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Metrics (informational)">
            <div className="grid grid-cols-2 gap-y-2 font-mono text-[11px] tabular-nums">
              {lastRun.oracle.metrics.map((m) => (
                <Fragment key={m.key}>
                  <span style={{ color: 'var(--fg-faint)' }}>{m.label}</span>
                  <span className="text-right" style={{ color: m.warn ? 'var(--warn)' : 'var(--fg)' }}>
                    {m.value}
                  </span>
                </Fragment>
              ))}
            </div>
          </Section>
        </>
      )}

      {submitResult && (
        <Section title="Submission — hidden seeds">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="rounded px-2 py-1 font-mono text-[11px] font-semibold"
              style={{
                background: submitResult.passed ? 'var(--ok-bg)' : 'var(--crit-bg)',
                color: submitResult.passed ? 'var(--ok)' : 'var(--crit)',
              }}
            >
              {Math.round(submitResult.passRate * 100)}% pass rate
            </span>
            {submitResult.passed && <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>Incident resolved.</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            {submitResult.runs.map((r) => (
              <div key={r.seed} className="flex items-center justify-between font-mono text-[10.5px]">
                <span style={{ color: 'var(--fg-muted)' }}>seed {r.seed}</span>
                <Chip ok={!r.error && r.oracle.passed} />
              </div>
            ))}
          </div>
          {submitResult.passed && (
            <>
              <div className="mt-3 rounded-md border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>
                  Root cause
                </div>
                <div className="text-[12.5px]" style={{ color: 'var(--fg)' }}>
                  {scenario.title}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[10.5px]" style={{ color: 'var(--fg-faint)' }}>
                  {(() => {
                    const solvedCount = SCENARIOS.filter(isScenarioSolved).length
                    return solvedCount >= SCENARIOS.length
                      ? `Rank: ${rankFor(solvedCount, SCENARIOS.length)} — every open incident is resolved`
                      : `Rank: ${rankFor(solvedCount, SCENARIOS.length)} (${solvedCount}/${SCENARIOS.length} resolved)`
                  })()}
                </span>
                <button onClick={() => navigate('/')} className="font-mono text-[11px] hover:underline" style={{ color: 'var(--accent)' }}>
                  ← open incidents
                </button>
              </div>
            </>
          )}
        </Section>
      )}
    </div>
  )
}
