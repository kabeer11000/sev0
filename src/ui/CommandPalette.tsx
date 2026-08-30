import { useEffect, useMemo, useRef, useState } from 'react'
import { useSev0Store } from '../store'
import { SCENARIOS } from '../scenario/scenarios'
import { navigate } from '../router'

interface Command {
  id: string
  group: 'Action' | 'File' | 'Node' | 'Incident'
  label: string
  hint?: string
  run: () => void
}

export function CommandPalette() {
  const open = useSev0Store((s) => s.commandPaletteOpen)
  const setOpen = useSev0Store((s) => s.setCommandPaletteOpen)
  const filesystem = useSev0Store((s) => s.filesystem)
  const scenario = useSev0Store((s) => s.scenario)
  const openFile = useSev0Store((s) => s.openFile)
  const openIncident = useSev0Store((s) => s.openIncident)
  const openDocs = useSev0Store((s) => s.openDocs)
  const openHints = useSev0Store((s) => s.openHints)
  const openTerminal = useSev0Store((s) => s.openTerminal)
  const runPractice = useSev0Store((s) => s.runPractice)
  const submit = useSev0Store((s) => s.submit)
  const setTutorialOpen = useSev0Store((s) => s.setTutorialOpen)

  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: Command[] = useMemo(
    () => [
      { id: 'run', group: 'Action', label: 'Run practice seed', hint: 'Ctrl+Enter', run: () => runPractice() },
      { id: 'submit', group: 'Action', label: 'Submit for grading', hint: 'Ctrl+Shift+Enter', run: () => submit() },
      { id: 'incident', group: 'Action', label: 'Open incident report', run: () => openIncident() },
      { id: 'docs', group: 'Action', label: 'Open SDK reference', run: () => openDocs() },
      { id: 'hints', group: 'Action', label: 'Open hints & solution', run: () => openHints() },
      { id: 'tutorial', group: 'Action', label: 'Show tutorial', run: () => setTutorialOpen(true) },
      { id: 'list', group: 'Incident', label: 'All open incidents', run: () => navigate('/') },
      ...SCENARIOS.filter((s) => s.caseId !== scenario.caseId).map((s) => ({
        id: `incident:${s.caseId}`,
        group: 'Incident' as const,
        label: `Switch to ${s.caseId} — ${s.displayTitle}`,
        run: () => navigate(`/incident/${s.caseId}`),
      })),
      ...filesystem.map((f) => ({
        id: `file:${f.path}`,
        group: 'File' as const,
        label: f.path,
        hint: f.editable ? 'editable' : 'sealed',
        run: () => openFile(f.path),
      })),
      ...scenario.topology.nodes.map((n) => ({
        id: `term:${n.id}`,
        group: 'Node' as const,
        label: `Open terminal — ${n.id}`,
        run: () => openTerminal(n.id),
      })),
    ],
    [filesystem, scenario, openFile, openIncident, openDocs, openHints, openTerminal, runPractice, submit, setTutorialOpen],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return commands.slice(0, 40)
    return commands.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 40)
  }, [commands, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSel(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => setSel(0), [query])

  if (!open) return null

  const exec = (c: Command) => {
    c.run()
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[14vh]"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[480px] flex-col overflow-hidden rounded-lg"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              setSel((s) => Math.min(s + 1, filtered.length - 1))
              e.preventDefault()
            }
            if (e.key === 'ArrowUp') {
              setSel((s) => Math.max(s - 1, 0))
              e.preventDefault()
            }
            if (e.key === 'Enter' && filtered[sel]) exec(filtered[sel])
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Jump to a file, or run a command…"
          className="border-b px-4 py-3 font-mono text-[13px] outline-none"
          style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--fg)' }}
        />
        <div className="max-h-[360px] overflow-y-auto py-1.5">
          {filtered.length === 0 && (
            <div className="px-4 py-3 font-mono text-[12px]" style={{ color: 'var(--fg-faint)' }}>
              no matches
            </div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              onClick={() => exec(c)}
              onMouseEnter={() => setSel(i)}
              className="flex w-full items-center justify-between px-4 py-1.5 text-left font-mono text-[12px]"
              style={{ background: i === sel ? 'var(--surface-hover)' : 'transparent', color: 'var(--fg)' }}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="shrink-0 rounded px-1 py-0.5 text-[9px] uppercase tracking-wide"
                  style={{ background: 'var(--surface)', color: 'var(--fg-faint)', border: '1px solid var(--border)' }}
                >
                  {c.group}
                </span>
                <span className="truncate">{c.label}</span>
              </span>
              {c.hint && (
                <span className="ml-3 shrink-0 text-[10px]" style={{ color: 'var(--fg-faint)' }}>
                  {c.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
