import { useEffect, useRef, useState } from 'react'
import { useSev0Store } from '../store'
import { runCommand, helpFor } from './terminalCommands'

export function Terminal({ nodeId }: { nodeId: string }) {
  const scenario = useSev0Store((s) => s.scenario)
  const lastRun = useSev0Store((s) => s.lastRun)
  const scrubberT = useSev0Store((s) => s.scrubberT)
  const lines = useSev0Store((s) => s.terminals[nodeId]) ?? []
  const runTerminalCommand = useSev0Store((s) => s.runTerminalCommand)
  const clearTerminal = useSev0Store((s) => s.clearTerminal)

  const [input, setInput] = useState('')
  const [historyIdx, setHistoryIdx] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const kind = scenario.topology.nodes.find((n) => n.id === nodeId)?.kind ?? 'worker'

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [lines])

  const submit = () => {
    const cmd = input.trim()
    setInput('')
    setHistoryIdx(-1)
    if (!cmd) return
    if (cmd.toLowerCase() === 'clear') {
      clearTerminal(nodeId)
      return
    }
    const output = runCommand(scenario, nodeId, kind, lastRun, scrubberT, cmd)
    runTerminalCommand(nodeId, cmd, output)
  }

  return (
    <div
      className="flex h-full flex-col font-mono text-[12px]"
      style={{ background: '#0a0a0a' }}
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <div className="mb-1" style={{ color: 'var(--fg-faint)' }}>
          connected to {nodeId} — type &lsquo;help&rsquo; for available commands ({helpFor(kind).join(', ')})
        </div>
        {lines.map((l, i) => (
          <div key={i} className="mb-1.5">
            <div style={{ color: 'var(--fg)' }}>
              <span style={{ color: 'var(--accent)' }}>{nodeId} $</span> {l.cmd}
            </div>
            {l.output.map((o, j) => (
              <div key={j} style={{ color: 'var(--fg-muted)' }} className="whitespace-pre-wrap">
                {o}
              </div>
            ))}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--accent)' }}>{nodeId} $</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'ArrowUp') {
                const next = Math.min(historyIdx + 1, lines.length - 1)
                setHistoryIdx(next)
                if (lines[lines.length - 1 - next]) setInput(lines[lines.length - 1 - next].cmd)
                e.preventDefault()
              }
              if (e.key === 'ArrowDown') {
                const next = historyIdx - 1
                setHistoryIdx(next)
                setInput(next >= 0 ? lines[lines.length - 1 - next].cmd : '')
                e.preventDefault()
              }
            }}
            autoFocus
            spellCheck={false}
            className="flex-1 bg-transparent outline-none"
            style={{ color: 'var(--fg)', caretColor: 'var(--accent)' }}
          />
        </div>
      </div>
    </div>
  )
}
