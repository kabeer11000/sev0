import { useState } from 'react'
import { useSev0Store } from '../store'

function Hint({ index, text }: { index: number; text: string }) {
  return (
    <div className="flex gap-3 rounded-md border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <span className="shrink-0 font-mono text-[11px]" style={{ color: 'var(--fg-faint)' }}>
        {index + 1}
      </span>
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        {text}
      </p>
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
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>
        Stuck?
      </div>
      <h1 className="mb-2 text-[19px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
        Hints
      </h1>
      <p className="mb-5 max-w-[62ch] text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        Each hint narrows things down a bit more than the last. Revealing one doesn&rsquo;t cost you anything — it
        just stays revealed if you come back to this incident later.
      </p>

      <div className="flex flex-col gap-2.5">
        {scenario.hints.slice(0, hintsRevealed).map((text, i) => (
          <Hint key={i} index={i} text={text} />
        ))}
      </div>

      {!allHintsShown && (
        <button
          onClick={() => revealNextHint()}
          className="mt-3 rounded-md border px-3 py-2 font-mono text-[11.5px] hover:underline"
          style={{ borderColor: 'var(--border-strong)', color: 'var(--accent)', background: 'var(--surface)' }}
        >
          Reveal hint {hintsRevealed + 1} of {scenario.hints.length}
        </button>
      )}

      <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
        <h2 className="mb-2 text-[15px] font-semibold">Solution</h2>
        {!solutionRevealed ? (
          <>
            <p className="mb-3 max-w-[62ch] text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              This shows the actual fix — the root cause and the corrected code for every editable file. It&rsquo;s
              here so you're never stuck for good, not because you should reach for it first.
            </p>
            {!confirmingSolution ? (
              <button
                onClick={() => setConfirmingSolution(true)}
                className="rounded-md border px-3 py-2 font-mono text-[11.5px]"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--fg-muted)', background: 'var(--surface)' }}
              >
                Show solution
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[12.5px]" style={{ color: 'var(--fg-muted)' }}>
                  This spoils the incident. Show it?
                </span>
                <button
                  onClick={() => revealSolution()}
                  className="rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold"
                  style={{ borderColor: 'var(--crit)', color: 'var(--crit)', background: 'var(--crit-bg)' }}
                >
                  Yes, show it
                </button>
                <button
                  onClick={() => setConfirmingSolution(false)}
                  className="rounded-md px-2.5 py-1 font-mono text-[11px]"
                  style={{ color: 'var(--fg-faint)' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mb-4 max-w-[68ch] text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              {scenario.solution.explanation}
            </p>
            <div className="flex flex-col gap-4">
              {scenario.solution.files.map((f) => {
                const vfsPath = `services/${f.path}`
                return (
                  <div key={f.path} className="overflow-hidden rounded-md border" style={{ borderColor: 'var(--border)' }}>
                    <div
                      className="flex items-center justify-between px-3 py-1.5 font-mono text-[11px]"
                      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-faint)' }}
                    >
                      <span>{f.path}</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => openFile(vfsPath)} className="hover:underline" style={{ color: 'var(--accent)' }}>
                          open file
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
                          use this fix
                        </button>
                      </div>
                    </div>
                    <pre className="overflow-x-auto p-3 font-mono text-[11.5px] leading-relaxed" style={{ color: 'var(--fg)' }}>
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
