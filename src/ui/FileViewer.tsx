import { useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { useSev0Store } from '../store'
import { nodesForFile } from './topologyState'
import { ensureMonacoSdkTypes } from './monacoSetup'

function MetaChip({
  tone,
  children,
  title,
}: {
  tone: 'accent' | 'ok' | 'neutral'
  children: React.ReactNode
  title?: string
}) {
  const bg =
    tone === 'accent' ? 'var(--accent-dim)' :
    tone === 'ok' ? 'var(--ok-bg)' :
    'var(--surface)'
  const fg =
    tone === 'accent' ? 'var(--accent-strong)' :
    tone === 'ok' ? 'var(--ok)' :
    'var(--fg-muted)'
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: bg, color: fg }}
      title={title}
    >
      {children}
    </span>
  )
}

function PencilIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 10 L 2 8 L 8 2 L 10 4 L 4 10 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="3" y="6" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 6 V 4 A 1.5 1.5 0 0 1 7.5 4 V 6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 6 A 4 4 0 1 0 4 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M2 1 L 2 4 L 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function FileViewer({ path }: { path: string }) {
  const file = useSev0Store((s) => s.filesystem.find((f) => f.path === path))
  const code = useSev0Store((s) => s.code[path])
  const setCode = useSev0Store((s) => s.setCode)
  const resetFile = useSev0Store((s) => s.resetFile)
  const scenario = useSev0Store((s) => s.scenario)
  const openTerminal = useSev0Store((s) => s.openTerminal)
  const openDocs = useSev0Store((s) => s.openDocs)

  useEffect(() => {
    ensureMonacoSdkTypes()
  }, [])

  if (!file) return null
  const runsOn = nodesForFile(scenario, path)

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-2"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          <MetaChip tone={file.editable ? 'accent' : 'neutral'} title={file.editable ? 'You can edit this file' : 'Read-only — sealed, part of the system'}>
            {file.editable ? <PencilIcon /> : <LockIcon />}
            {file.editable ? 'editable' : 'sealed'}
          </MetaChip>
          {file.editable && (
            <button
              onClick={() => openDocs()}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
            >
              ctx SDK ref
            </button>
          )}
          {runsOn.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: 'var(--surface)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--fg-faint)' }}>runs on</span>
              {runsOn.map((id, i) => (
                <span key={id} className="flex items-center gap-1.5">
                  {i > 0 && <span style={{ color: 'var(--fg-faint)' }}>·</span>}
                  <button
                    onClick={() => openTerminal(id)}
                    className="rounded-full px-1.5 py-0 font-mono font-semibold transition-colors hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--accent-strong)' }}
                  >
                    {id}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        {file.editable && (
          <button
            onClick={() => resetFile(path)}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-medium transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
            style={{ color: 'var(--fg-muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}
            title="Restore the starter code (your edits are local — this just rolls them back)"
          >
            <ResetIcon /> reset
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={file.language}
          theme="sev0-light"
          value={file.editable ? code : file.content}
          onChange={file.editable ? (v) => setCode(path, v ?? '') : undefined}
          options={{
            readOnly: !file.editable,
            domReadOnly: !file.editable,
            fontFamily: 'Geist Mono, ui-monospace, monospace',
            fontSize: 13,
            minimap: { enabled: false },
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            lineNumbersMinChars: 3,
            renderLineHighlight: file.editable ? 'line' : 'none',
            fontLigatures: false,
            mouseWheelZoom: false,
          }}
        />
      </div>
    </div>
  )
}