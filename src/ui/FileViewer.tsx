import { useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { useSev0Store } from '../store'
import { nodesForFile } from './topologyState'
import { ensureMonacoSdkTypes } from './monacoSetup'

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
      <div className="flex items-center justify-between border-b px-4 py-1.5" style={{ borderColor: 'var(--border)' }}>
        <span className="flex items-center gap-2 font-mono text-[11px]" style={{ color: 'var(--fg-faint)' }}>
          <span>{file.editable ? 'editable — the defect may live here' : 'read-only — sealed, part of the system'}</span>
          {file.editable && (
            <>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <button onClick={() => openDocs()} className="hover:underline" style={{ color: 'var(--accent)' }}>
                ctx. SDK reference
              </button>
            </>
          )}
          {runsOn.length > 0 && (
            <>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <span>
                runs on:{' '}
                {runsOn.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ', '}
                    <button onClick={() => openTerminal(id)} className="hover:underline" style={{ color: 'var(--accent)' }}>
                      {id}
                    </button>
                  </span>
                ))}
              </span>
            </>
          )}
        </span>
        {file.editable && (
          <button onClick={() => resetFile(path)} className="font-mono text-[11px] hover:underline" style={{ color: 'var(--fg-muted)' }}>
            reset to starter
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={file.language}
          theme="vs-dark"
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
