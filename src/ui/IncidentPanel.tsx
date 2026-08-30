import { useSev0Store } from '../store'
import { DIFFICULTY_LABEL, DIFFICULTY_COLOR } from './difficulty'

export function IncidentPanel() {
  const scenario = useSev0Store((s) => s.scenario)
  const openFile = useSev0Store((s) => s.openFile)
  const openDocs = useSev0Store((s) => s.openDocs)
  const openHints = useSev0Store((s) => s.openHints)
  const editablePaths = scenario.editableFiles.map((f) => `services/${f.path}`)

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
        >
          {scenario.severity}
        </span>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide"
          style={{ background: 'var(--surface)', border: `1px solid ${DIFFICULTY_COLOR[scenario.difficulty]}`, color: DIFFICULTY_COLOR[scenario.difficulty] }}
        >
          {DIFFICULTY_LABEL[scenario.difficulty]}
        </span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--fg-faint)' }}>
          {scenario.caseId}
        </span>
      </div>
      <h1 className="mb-4 text-[19px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
        {scenario.displayTitle}
      </h1>

      <div className="mb-6 flex flex-col gap-2 rounded-md border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {scenario.incidentReport.map((line, i) => (
          <p key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            {line}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-3 text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        <p>
          <strong style={{ color: 'var(--fg)' }}>Editable:</strong>{' '}
          {editablePaths.map((p, i) => (
            <span key={p}>
              {i > 0 && ', '}
              <button onClick={() => openFile(p)} className="hover:underline" style={{ color: 'var(--accent)' }}>
                {p}
              </button>
            </span>
          ))}
          . The rest of the codebase in the Files panel is sealed — read it for context, but you can&rsquo;t change it.
          The{' '}
          <button onClick={() => openDocs()} className="hover:underline" style={{ color: 'var(--accent)' }}>
            Docs
          </button>{' '}
          tab has the full ctx API with examples.
        </p>
        <p>
          <strong style={{ color: 'var(--fg)' }}>Run</strong> replays the incident on a seed you can see and inspect frame
          by frame in the timeline below. <strong style={{ color: 'var(--fg)' }}>Submit</strong> grades your fix against{' '}
          {scenario.hiddenSeeds.length} seeds you haven&rsquo;t seen — passing means the defect is actually gone, not just
          quiet on this one replay.
        </p>
        <p>
          Right-click any node in the topology to open its file, drop into a terminal, or jump to its config.
        </p>
        <p>
          Stuck?{' '}
          <button onClick={() => openHints()} className="hover:underline" style={{ color: 'var(--accent)' }}>
            Hints
          </button>{' '}
          has progressive nudges and, if you want it, the full solution.
        </p>
      </div>
    </div>
  )
}
