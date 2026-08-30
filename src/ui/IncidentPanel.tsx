import { useSev0Store } from '../store'
import { DIFFICULTY_LABEL } from './difficulty'
import { Chip } from './Chip'
import { IncidentHero } from './IncidentHero'

const BASE_XP = { tutorial: 50, easy: 100, medium: 200, hard: 400 } as const

function maxXpFor(difficulty: keyof typeof BASE_XP): number {
  // upper bound shown on the hero: base + full time bonus + no-hint + clean + first
  const bonus = difficulty === 'hard' ? 30 : difficulty === 'medium' ? 15 : difficulty === 'easy' ? 5 : 0
  return BASE_XP[difficulty] + bonus + 200 + 100
}

export function IncidentPanel() {
  const scenario = useSev0Store((s) => s.scenario)
  const solved = useSev0Store((s) => s.solved)
  const openFile = useSev0Store((s) => s.openFile)
  const openDocs = useSev0Store((s) => s.openDocs)
  const openHints = useSev0Store((s) => s.openHints)
  const editablePaths = scenario.editableFiles.map((f) => `services/${f.path}`)

  return (
    <div className="h-full overflow-y-auto px-7 py-7">
      <IncidentHero scenario={scenario} solved={solved} xpReward={maxXpFor(scenario.difficulty)} />

      <div className="mb-3 flex items-center gap-2">
        <Chip tone={scenario.severity === 'SEV0' ? 'crit' : scenario.severity === 'SEV1' ? 'warn' : 'neutral'}>
          {scenario.severity}
        </Chip>
        <Chip tone={scenario.difficulty === 'hard' ? 'crit' : scenario.difficulty === 'medium' ? 'warn' : 'ok'}>
          {DIFFICULTY_LABEL[scenario.difficulty]}
        </Chip>
        <span className="font-mono text-[11px]" style={{ color: 'var(--fg-faint)' }}>
          {scenario.caseId}
        </span>
      </div>

      <div className="mb-6 flex flex-col gap-2 rounded-3xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {scenario.incidentReport.map((line, i) => (
          <p key={i} className="text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            {line}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-3 text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
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
          . The rest of the Files panel is there for context — read freely, but only these are yours to change.
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
          Right-click any node to jump into its code, open a shell on it, or view its config.
        </p>
        <p>
          Need a nudge?{' '}
          <button onClick={() => openHints()} className="hover:underline" style={{ color: 'var(--accent)' }}>
            Hints
          </button>{' '}
          opens one piece at a time, with the full solution gated behind a confirmation.
        </p>
      </div>
    </div>
  )
}
