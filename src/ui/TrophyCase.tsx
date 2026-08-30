import { BADGE_BY_ID } from '../badges'
import type { BadgeId } from '../badges'
import { BadgeIcon } from './BadgeIcon'

interface Props {
  owned: ReadonlyArray<BadgeId>
  bestStreak?: number
}

export function TrophyCase({ owned, bestStreak }: Props) {
  if (owned.length === 0) return null
  return (
    <div
      className="mb-6 flex items-center gap-4 rounded-3xl p-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex flex-col">
        <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--fg-faint)', letterSpacing: '0.04em' }}>
          Trophy case
        </span>
        {bestStreak !== undefined && bestStreak > 0 && (
          <span className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
            Best streak: {bestStreak}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
        {owned.map((id) => {
          const badge = BADGE_BY_ID[id]
          return (
            <span
              key={id}
              title={`${badge.label} — ${badge.blurb}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent-strong)' }}
            >
              <BadgeIcon id={id} size={20} />
            </span>
          )
        })}
      </div>
    </div>
  )
}