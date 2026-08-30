import { useEffect, useState } from 'react'
import { SCENARIOS } from '../scenario/scenarios'
import { navigate } from '../router'
import { Logo } from './Logo'
import { DIFFICULTY_LABEL } from './difficulty'
import { getSolveMeta, isScenarioSolved, loadProgress } from '../progress'
import { AccountMenu } from './AccountMenu'
import { Chip } from './Chip'
import { TrophyCase } from './TrophyCase'
import { readStreak } from '../streak'
import { HundredPercentIllustration } from './HundredPercentIllustration'
import { StreakHero } from './StreakHero'
import { SparkleIcon } from './SparkleIcon'
import { QuestCard } from './QuestCard'
import { levelProgress } from '../levels'
import { AnimatedCounter } from './AnimatedCounter'

function DoneCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12 L 10 17 L 19 7" />
    </svg>
  )
}

const DIFFICULTY_BG: Record<string, string> = {
  tutorial: 'var(--tier-tutorial)',
  easy: 'var(--tier-easy)',
  medium: 'var(--tier-medium)',
  hard: 'var(--tier-hard)',
}

function fmtBest(ms: number): string {
  if (!ms) return '—'
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function IncidentCard({ scenario }: { scenario: (typeof SCENARIOS)[number] }) {
  const solved = isScenarioSolved(scenario)
  const meta = getSolveMeta(scenario)
  const tierBg = DIFFICULTY_BG[scenario.difficulty] ?? 'var(--surface)'
  return (
    <button
      onClick={() => navigate(`/incident/${scenario.caseId}`)}
      className="group relative flex w-full flex-col gap-3 overflow-hidden rounded-3xl border p-6 text-left transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:scale-[1.008] active:scale-[0.99]"
      style={{
        borderColor: solved ? 'var(--ok)' : 'var(--border)',
        background: tierBg,
        boxShadow: solved ? '0 0 0 1px rgba(61,138,90,0.18)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!solved) e.currentTarget.style.borderColor = 'var(--border-strong)'
        e.currentTarget.style.boxShadow = solved ? '0 8px 24px rgba(61,138,90,0.14)' : '0 12px 28px rgba(43, 36, 28, 0.10)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = solved ? 'var(--ok)' : 'var(--border)'
        e.currentTarget.style.boxShadow = solved ? '0 0 0 1px rgba(61,138,90,0.18)' : 'none'
      }}
    >
      {solved && (
        <span
          className="sparkle-spin pointer-events-none absolute -right-3 -top-3 opacity-70"
          style={{ color: 'var(--accent)' }}
          aria-hidden
        >
          <SparkleIcon size={32} />
        </span>
      )}
      <div className="flex items-center gap-2">
        <Chip tone={scenario.severity === 'SEV0' ? 'crit' : scenario.severity === 'SEV1' ? 'warn' : 'neutral'}>
          {scenario.severity}
        </Chip>
        <Chip tone={scenario.difficulty === 'hard' ? 'crit' : scenario.difficulty === 'medium' ? 'warn' : 'ok'}>
          {DIFFICULTY_LABEL[scenario.difficulty]}
        </Chip>
        {solved && (
          <span className="flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--ok)' }}>
            <DoneCheck /> Done
          </span>
        )}
        <span className="font-mono text-[11px]" style={{ color: 'var(--fg-faint)' }}>
          {scenario.caseId}
        </span>
      </div>
      <h2 className="text-[16px] font-semibold leading-snug" style={{ letterSpacing: '-0.005em' }}>
        {scenario.displayTitle}
      </h2>
      <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        {scenario.incidentReport[0]}
      </p>
      <div className="mt-1 flex items-center gap-3 text-[12px]" style={{ color: 'var(--fg-faint)' }}>
        <span>{scenario.editableFiles.length} editable file{scenario.editableFiles.length === 1 ? '' : 's'}</span>
        <span>·</span>
        <span>{scenario.hiddenSeeds.length} hidden seeds</span>
        <span>·</span>
        <span>{Math.round(scenario.timeLimitMs / 60000)} min budget</span>
        {meta?.bestResolutionMs ? (
          <>
            <span>·</span>
            <span>Best {fmtBest(meta.bestResolutionMs)}</span>
          </>
        ) : null}
        <span className="ml-auto font-medium opacity-0 transition-opacity group-hover:opacity-100" style={{ color: solved ? 'var(--ok)' : 'var(--accent-strong)' }}>
          {solved ? 'Replay →' : 'Start →'}
        </span>
      </div>
    </button>
  )
}

export function IncidentListPage() {
  const [progress, setProgress] = useState(() => loadProgress())
  const [streak, setStreak] = useState(() => readStreak())

  useEffect(() => {
    const refresh = () => {
      setProgress(loadProgress())
      setStreak(readStreak())
    }
    const id = setInterval(refresh, 1500)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const solvedCount = SCENARIOS.filter(isScenarioSolved).length
  const total = SCENARIOS.length
  const lvl = levelProgress(progress.totalXp)

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[760px] px-7 py-14">
        <div className="mb-7 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/leaderboard')} className="text-[12.5px] hover:underline" style={{ color: 'var(--fg-faint)' }}>
              Leaderboard
            </button>
            <AccountMenu />
          </div>
        </div>

        <h1 className="mb-2 text-[26px] font-semibold" style={{ letterSpacing: '-0.012em' }}>
          Open incidents
        </h1>
        <p className="mb-1 max-w-[60ch] text-[14px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          A flight simulator for production. You don&rsquo;t fly the plane — you&rsquo;re handed one that&rsquo;s
          already on fire. Pick an incident, read the signals, find what&rsquo;s actually wrong, and prove your fix
          holds on seeds you&rsquo;ve never seen.
        </p>
        <p className="mb-7 max-w-[60ch] text-[12.5px] leading-relaxed" style={{ color: 'var(--fg-faint)' }}>
          No real customers were harmed in the making of these outages.
        </p>

        <div className="mb-6 rounded-3xl border p-5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg-elevated) 100%)', boxShadow: 'var(--shadow-card)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[14px] font-semibold" style={{ color: 'var(--fg)' }}>
              {lvl.current.title}
              {lvl.next ? (
                <span className="ml-2 text-[12px] font-normal" style={{ color: 'var(--fg-faint)' }}>
                  next: {lvl.next.title}
                </span>
              ) : (
                <span className="ml-2 text-[12px] font-normal" style={{ color: 'var(--fg-faint)' }}>
                  max rank
                </span>
              )}
            </span>
            <span className="text-[12px]" style={{ color: 'var(--fg-faint)' }}>
              <AnimatedCounter value={progress.totalXp} className="font-semibold" /> XP
              <span className="mx-1.5">·</span>
              {solvedCount} / {total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.round(lvl.pct * 100)}%`, background: 'var(--accent)' }}
            />
          </div>
        </div>

        <TrophyCase owned={progress.badges} bestStreak={streak.best} />
        <div className="mt-4">
          <QuestCard />
        </div>
        <div className="mt-4">
          <StreakHero streak={streak} />
        </div>

        <div className="flex flex-col gap-3.5">
          {SCENARIOS.map((s) => (
            <IncidentCard key={s.caseId} scenario={s} />
          ))}
        </div>

        {solvedCount === total && total > 0 && (
          <div className="mt-6 flex items-center gap-3 rounded-3xl border p-4" style={{ borderColor: 'var(--ok)', background: 'var(--ok-bg)', boxShadow: '0 0 0 1px rgba(61,138,90,0.18)' }}>
            <HundredPercentIllustration />
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold" style={{ color: 'var(--ok)' }}>
                All quiet on the queue. Nice work.
              </span>
              <span className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
                Every incident is resolved — Centurion earned.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}