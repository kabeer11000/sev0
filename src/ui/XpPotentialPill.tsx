import { useEffect, useRef, useState } from 'react'
import { useSev0Store } from '../store'
import { computeXp } from '../xp'
import type { XpBreakdown } from '../xp'
import { loadProgress } from '../progress'
import { SparkleIcon } from './SparkleIcon'

function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <radialGradient id="xp-coin-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffe1a8" />
          <stop offset="55%" stopColor="#f3a14e" />
          <stop offset="100%" stopColor="#c4552f" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#xp-coin-grad)" stroke="#7c3a16" strokeWidth="1" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="#7c3a16"
        fontFamily="ui-monospace, monospace"
      >
        XP
      </text>
    </svg>
  )
}

interface BreakdownRow {
  label: string
  value: number
  positive: boolean
}

function buildBreakdown(b: XpBreakdown): BreakdownRow[] {
  const rows: BreakdownRow[] = [{ label: 'Base', value: b.base, positive: b.base >= 0 }]
  if (b.time !== 0) rows.push({ label: 'Speed', value: b.time, positive: b.time > 0 })
  if (b.first > 0) rows.push({ label: 'First solve', value: b.first, positive: true })
  if (b.soln > 0) rows.push({ label: 'No peeking', value: b.soln, positive: true })
  if (b.hint < 0) rows.push({ label: 'Hints', value: b.hint, positive: false })
  return rows
}

export function XpPotentialPill() {
  const scenario = useSev0Store((s) => s.scenario)
  const hintsRevealed = useSev0Store((s) => s.hintsRevealed)
  const solutionRevealed = useSev0Store((s) => s.solutionRevealed)
  const taskStartedAt = useSev0Store((s) => s.taskStartedAt)
  const [now, setNow] = useState(() => Date.now())
  const previousTotal = useRef<number | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const prior = loadProgress()
  const isFirstSolve = !(scenario.caseId in prior.solved)
  const breakdown = computeXp(scenario, now - taskStartedAt, hintsRevealed, solutionRevealed, isFirstSolve)

  // spring-pop animation when total changes
  useEffect(() => {
    if (previousTotal.current !== null && previousTotal.current !== breakdown.total) {
      const el = document.getElementById('xp-potential-num')
      if (el) {
        el.classList.remove('xp-pop')
        // force reflow so the animation re-triggers
        void el.offsetWidth
        el.classList.add('xp-pop')
      }
    }
    previousTotal.current = breakdown.total
  }, [breakdown.total])

  const overBudget = now - taskStartedAt >= scenario.timeLimitMs
  const time = Math.max(0, Math.floor((scenario.timeLimitMs - (now - taskStartedAt)) / 60_000))
  const rows = buildBreakdown(breakdown)
  const total = breakdown.total

  // visual state per XP amount
  let bg: string
  let shadow: string
  let numColor: string
  if (overBudget) {
    bg = 'linear-gradient(135deg, #f1ebe2 0%, var(--crit-bg) 100%)'
    shadow = '0 4px 14px rgba(196, 61, 52, 0.18)'
    numColor = 'var(--crit)'
  } else if (total >= 350) {
    bg = 'linear-gradient(135deg, #fff5ec 0%, #ffd9a8 60%, #f3a14e 100%)'
    shadow = '0 6px 18px rgba(238, 90, 54, 0.32)'
    numColor = '#7c3a16'
  } else if (total >= 200) {
    bg = 'linear-gradient(135deg, #fff5ec 0%, var(--accent-dim) 100%)'
    shadow = '0 6px 18px rgba(238, 90, 54, 0.22)'
    numColor = 'var(--accent-strong)'
  } else {
    bg = 'linear-gradient(135deg, var(--surface) 0%, var(--bg-elevated) 100%)'
    shadow = '0 2px 6px rgba(43, 36, 28, 0.08)'
    numColor = 'var(--fg-muted)'
  }

  return (
    <div className="relative group">
      <div
        className="flex h-10 items-center gap-2.5 rounded-full pl-2.5 pr-4"
        style={{
          background: bg,
          boxShadow: shadow,
          border: '1px solid rgba(255,255,255,0.6)',
          transition: 'background 400ms ease, box-shadow 400ms ease',
        }}
      >
        {/* coin disc */}
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }}>
          <span className="sparkle-spin" style={{ animationDuration: '6s' }}>
            <CoinIcon size={18} />
          </span>
        </span>
        {/* big number */}
        <div className="flex flex-col leading-none">
          <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-faint)', letterSpacing: '0.10em' }}>
            Reward
          </span>
          <div className="flex items-baseline gap-1">
            <span
              id="xp-potential-num"
              className="font-mono text-[17px] font-extrabold tabular-nums"
              style={{ color: numColor }}
            >
              +{total}
            </span>
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: numColor, opacity: 0.7 }}>
              XP
            </span>
          </div>
        </div>
        {/* hint penalty chip */}
        {breakdown.hint < 0 && (
          <span
            className="rounded-full px-2 font-mono text-[10.5px] font-bold tabular-nums"
            style={{ background: 'var(--crit)', color: '#fff' }}
          >
            {breakdown.hint}
          </span>
        )}
        {/* overtime chip */}
        {overBudget && (
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider"
            style={{ background: 'var(--crit)', color: '#fff' }}
          >
            OT
          </span>
        )}
      </div>

      {/* sparkle accents when value is high */}
      {total >= 350 && (
        <>
          <span className="sparkle-spin pointer-events-none absolute" style={{ right: -4, top: -4, color: 'var(--accent)' }}>
            <SparkleIcon size={12} />
          </span>
          <span className="sparkle-spin pointer-events-none absolute" style={{ left: 6, bottom: -2, color: 'var(--accent)', animationDuration: '5s' }}>
            <SparkleIcon size={8} />
          </span>
        </>
      )}

      {/* breakdown tooltip on hover */}
      <div
        className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl p-4 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: '0 16px 40px rgba(43, 36, 28, 0.18)',
          transform: 'translateY(-4px)',
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-faint)', letterSpacing: '0.08em' }}>
            Potential XP
          </span>
          <span className="font-mono text-[12px] font-bold" style={{ color: 'var(--accent-strong)' }}>
            +{total}
          </span>
        </div>
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-[11.5px]" style={{ color: 'var(--fg-muted)' }}>
                {row.label}
              </span>
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
                style={{
                  background: row.positive ? 'var(--ok-bg)' : 'var(--crit-bg)',
                  color: row.positive ? 'var(--ok)' : 'var(--crit)',
                }}
              >
                {row.value > 0 ? `+${row.value}` : row.value}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--fg-faint)' }}>
            <span>Time bonus remaining</span>
            <span className="font-mono tabular-nums">
              {overBudget ? '0 min' : `${time} min`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
