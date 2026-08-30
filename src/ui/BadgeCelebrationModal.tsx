import { BadgeIcon } from './BadgeIcon'
import type { BadgeId } from '../badges'
import { BADGES } from '../badges'
import { Confetti } from './Confetti'

interface Props {
  badges: BadgeId[]
  onClose: () => void
}

export function BadgeCelebrationModal({ badges, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(43, 36, 28, 0.40)' }}
      onClick={onClose}
    >
      <Confetti count={90} />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="pop-in flex w-full max-w-[420px] flex-col items-center rounded-3xl p-7 text-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
          badge unlocked
        </div>
        <h2 className="mb-5 text-[20px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
          {badges.length === 1 ? 'You earned a badge!' : `You earned ${badges.length} badges!`}
        </h2>

        <div className="mb-5 flex flex-wrap justify-center gap-4">
          {badges.map((id) => {
            const meta = BADGES.find((b) => b.id === id)
            return (
              <div key={id} className="flex w-[112px] flex-col items-center gap-2">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent-strong)' }}
                >
                  <BadgeIcon id={id} size={32} />
                </div>
                <div className="text-[12.5px] font-semibold" style={{ color: 'var(--fg)' }}>
                  {meta?.label ?? id}
                </div>
                {meta?.blurb && (
                  <div className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
                    {meta.blurb}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="h-9 rounded-lg px-5 text-[13px] font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          Awesome
        </button>
      </div>
    </div>
  )
}
