import { Fragment } from 'react'
import { useSev0Store } from '../store'
import { navigate } from '../router'
import { ResolutionCelebration } from './ResolutionCelebration'

function Chip({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: ok ? 'var(--ok-bg)' : 'var(--crit-bg)',
        color: ok ? 'var(--ok)' : 'var(--crit)',
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: ok ? 'var(--ok)' : 'var(--crit)' }}
      />
      {ok ? 'Pass' : 'Fail'}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2 text-[10.5px] font-bold uppercase"
      style={{ color: 'var(--fg-faint)', letterSpacing: '0.10em' }}
    >
      {children}
    </div>
  )
}

function Section({
  title,
  children,
  tone,
}: {
  title: string
  children: React.ReactNode
  tone?: 'crit' | 'ok' | 'neutral'
}) {
  const accent =
    tone === 'ok' ? 'var(--ok)' :
    tone === 'crit' ? 'var(--crit)' :
    'var(--fg-muted)'
  return (
    <div
      className="mx-5 mb-3 rounded-2xl border p-4"
      style={{
        borderColor: tone === 'ok' ? 'var(--ok-bg)' : tone === 'crit' ? 'var(--crit-bg)' : 'var(--border)',
        background: tone === 'ok' ? 'rgba(220, 234, 223, 0.4)' : tone === 'crit' ? 'rgba(246, 218, 214, 0.4)' : 'var(--bg-elevated)',
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        <span
          className="text-[10.5px] font-bold uppercase"
          style={{ color: accent, letterSpacing: '0.10em' }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

export function VerdictPanel() {
  const lastRun = useSev0Store((s) => s.lastRun)
  const submitResult = useSev0Store((s) => s.submitResult)
  const scenario = useSev0Store((s) => s.scenario)
  const lastResolution = useSev0Store((s) => s.lastResolution)

  return (
    <div id="verdict-panel-root" className="flex h-full flex-col overflow-y-auto py-3">
      {lastResolution && (
        <div className="px-5 pb-3">
          <ResolutionCelebration resolution={lastResolution} />
        </div>
      )}

      {!lastRun && (
        <div
          className="mx-5 rounded-2xl border p-5"
          style={{
            borderColor: 'var(--border)',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--surface) 100%)',
          }}
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--accent-dim)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-strong)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </div>
          <div className="mb-1 text-[13.5px] font-semibold" style={{ color: 'var(--fg)' }}>
            No run yet
          </div>
          <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Hit <span className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold" style={{ background: 'var(--accent-dim)', color: 'var(--accent-strong)' }}>Run</span> to replay the incident on a seed you can see. Submitting grades your fix against{' '}
            {scenario.hiddenSeeds.length} hidden seeds you haven&rsquo;t seen.
          </p>
        </div>
      )}

      {lastRun?.error && (
        <Section title="Compile error" tone="crit">
          <pre className="whitespace-pre-wrap font-mono text-[11.5px]" style={{ color: 'var(--crit)' }}>
            {lastRun.error}
          </pre>
        </Section>
      )}

      {lastRun && !lastRun.error && (
        <>
          <Section title={`Invariants · practice seed ${lastRun.seed}`}>
            <div className="flex flex-col gap-3">
              {lastRun.oracle.results.map((r) => (
                <div key={r.key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--fg)' }}>
                      {r.title}
                    </span>
                    <Chip ok={r.passed} />
                  </div>
                  <span className="font-mono text-[11.5px]" style={{ color: 'var(--fg-muted)' }}>
                    {r.detail}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Metrics · informational">
            <div className="grid grid-cols-2 gap-y-2.5 font-mono text-[12px] tabular-nums">
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
        <Section title="Submission · hidden seeds" tone={submitResult.passed ? 'ok' : 'crit'}>
          <div className="mb-4">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-bold"
              style={{
                background: submitResult.passed ? 'var(--ok)' : 'var(--crit)',
                color: '#fff',
              }}
            >
              <span className="inline-block h-2 w-2 rounded-full bg-white" />
              {Math.round(submitResult.passRate * 100)}% pass rate
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {submitResult.runs.map((r) => (
              <div key={r.seed} className="flex items-center justify-between rounded-lg px-2 py-1 font-mono text-[12px]" style={{ background: r.error || !r.oracle.passed ? 'var(--crit-bg)' : 'var(--ok-bg)' }}>
                <span style={{ color: 'var(--fg-muted)' }}>seed {r.seed}</span>
                <Chip ok={!r.error && r.oracle.passed} />
              </div>
            ))}
          </div>
          {submitResult.passed && (
            <>
              <div className="mt-4 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <SectionTitle>Root cause</SectionTitle>
                <div className="text-[13px]" style={{ color: 'var(--fg)' }}>
                  {scenario.title}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-full px-4 py-2" style={{ background: 'var(--surface)' }}>
                <span className="text-[12.5px]" style={{ color: 'var(--fg-muted)' }}>
                  Want to do another?
                </span>
                <button
                  onClick={() => navigate('/')}
                  className="text-[12.5px] font-semibold hover:underline"
                  style={{ color: 'var(--accent-strong)' }}
                >
                  ← back to the queue
                </button>
              </div>
            </>
          )}
        </Section>
      )}
    </div>
  )
}