import { useState } from 'react'
import { useSev0Store } from '../store'

const HINT_TIERS = [
  { bg: 'var(--tier-tutorial)', fg: 'var(--tier-tutorial-fg)', label: 'Nudge' },
  { bg: 'var(--tier-easy)', fg: 'var(--tier-easy-fg)', label: 'Hint' },
  { bg: 'var(--tier-medium)', fg: 'var(--tier-medium-fg)', label: 'Closer' },
  { bg: 'var(--tier-hard)', fg: 'var(--tier-hard-fg)', label: 'Almost there' },
]

function Hint({ index, text }: { index: number; text: string }) {
  const tier = HINT_TIERS[index % HINT_TIERS.length] ?? HINT_TIERS[0]!
  return (
    <div
      className="pop-in flex gap-3 rounded-2xl border p-4"
      style={{ borderColor: tier.fg, background: tier.bg }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-bold"
        style={{ background: 'rgba(255,255,255,0.85)', color: tier.fg }}
      >
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className="text-[10px] font-bold uppercase"
          style={{ color: tier.fg, letterSpacing: '0.10em' }}
        >
          {tier.label}
        </span>
        <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--fg)' }}>
          {text}
        </p>
      </div>
    </div>
  )
}

export function HintsPanel() {
  const scenario = useSev0Store((s) => s.scenario)
  const hintsRevealed = useSev0Store((s) => s.hintsRevealed)
  const revealNextHint = useSev0Store((s) => s.revealNextHint)
  const solutionRevealed = useSev0Store((s) => s.solutionRevealed)
  const revealSolution = useSev0Store((s) => s.revealSolution)
  const setCode = useSev0Store((s) => s.setCode)
  const openFile = useSev0Store((s) => s.openFile)
  const showToast = useSev0Store((s) => s.showToast)
  const [confirmingSolution, setConfirmingSolution] = useState(false)

  const allHintsShown = hintsRevealed >= scenario.hints.length

  return (
    <div className="h-full overflow-y-auto px-7 py-7">
      <h1 className="mb-2 text-[19px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
        Hints
      </h1>
      <p className="mb-5 max-w-[62ch] text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        Each hint narrows things down a bit more than the last. Each hint you reveal is remembered — you won&rsquo;t
        have to reveal it again if you come back.
      </p>

      <div className="flex flex-col gap-3">
        {scenario.hints.slice(0, hintsRevealed).map((text, i) => (
          <Hint key={i} index={i} text={text} />
        ))}
      </div>

      {!allHintsShown && (
        <button
          onClick={() => revealNextHint()}
          className="mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-md"
          style={{
            background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg-elevated) 100%)',
            color: 'var(--accent-strong)',
            border: '1px solid var(--accent-dim)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 1.5 L 14 5 L 8 8.5 L 2 5 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M2 11 L 8 14.5 L 14 11" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity="0.5" />
          </svg>
          Reveal hint {hintsRevealed + 1} of {scenario.hints.length}
          <span className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums" style={{ background: 'var(--crit-bg)', color: 'var(--crit)' }}>
            −50 XP
          </span>
        </button>
      )}

      <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
        <h2 className="mb-2 text-[15px] font-semibold">Solution</h2>
        {!solutionRevealed ? (
          <>
            <p className="mb-3 max-w-[62ch] text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              Here&rsquo;s what was actually wrong, plus the corrected code. Use it if you&rsquo;re truly stuck — and
              the badges get less interesting if you do.
            </p>
            {!confirmingSolution ? (
              <button
                onClick={() => setConfirmingSolution(true)}
                className="rounded-full border px-5 py-2 text-[13px] font-medium"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--fg-muted)', background: 'var(--surface)' }}
              >
                Show solution
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>
                  This spoils the incident. Show it?
                </span>
                <button
                  onClick={() => revealSolution()}
                  className="rounded-full border px-4 py-1.5 text-[12.5px] font-semibold"
                  style={{ borderColor: 'var(--crit)', color: 'var(--crit)', background: 'var(--crit-bg)' }}
                >
                  Yes, show it
                </button>
                <button
                  onClick={() => setConfirmingSolution(false)}
                  className="rounded-full px-4 py-1.5 text-[12.5px]"
                  style={{ color: 'var(--fg-faint)' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mb-4 max-w-[68ch] text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              {scenario.solution.explanation}
            </p>
            <div className="flex flex-col gap-4">
              {scenario.solution.files.map((f) => {
                const vfsPath = `services/${f.path}`
                return (
                  <div key={f.path} className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
                    <div
                      className="flex items-center justify-between px-4 py-2 text-[12px]"
                      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-faint)' }}
                    >
                      <span className="font-mono">{f.path}</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => openFile(vfsPath)} className="hover:underline" style={{ color: 'var(--accent)' }}>
                          Open file
                        </button>
                        <button
                          onClick={() => {
                            setCode(vfsPath, f.code)
                            openFile(vfsPath)
                            showToast(`Applied the solution to ${f.path}`)
                          }}
                          className="hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          Use this fix
                        </button>
                      </div>
                    </div>
                    <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed" style={{ color: 'var(--fg)' }}>
                      {f.code}
                    </pre>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
