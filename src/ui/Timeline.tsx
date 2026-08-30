import { useEffect, useMemo, useRef, useState } from 'react'
import { useSev0Store } from '../store'

const PLAY_SPEED = 1000 // simulated ms advanced per real second at 1x — 1x is real time
const SPEEDS = [1, 2, 4, 8]

function fmt(ms: number): string {
  const s = ms / 1000
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m${Math.round(s % 60)
    .toString()
    .padStart(2, '0')}s`
}

function PlayIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden>
      <polygon points="0,0 9,4.5 0,9" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden>
      <rect width="3" height="9" fill="currentColor" rx="0.5" />
      <rect x="6" width="3" height="9" fill="currentColor" rx="0.5" />
    </svg>
  )
}

function ReplayIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 6 A4 4 0 1 0 4 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M2 1 L2 4 L5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function Timeline() {
  const lastRun = useSev0Store((s) => s.lastRun)
  const scrubberT = useSev0Store((s) => s.scrubberT)
  const setScrubberT = useSev0Store((s) => s.setScrubberT)
  const playing = useSev0Store((s) => s.playing)
  const setPlaying = useSev0Store((s) => s.setPlaying)
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)

  const maxT = lastRun?.log.lastTime ?? 0

  const markers = useMemo(() => {
    if (!lastRun) return []
    const seen = new Set<string>()
    const requestedTotal = new Map<string, number>()
    const out: { t: number; kind: string; label: string }[] = []
    for (const e of lastRun.log.all()) {
      if (e.kind === 'fault.latency_spike_start') out.push({ t: e.t, kind: 'warn', label: 'gateway p99 spikes' })
      if (e.kind === 'fault.latency_spike_end') out.push({ t: e.t, kind: 'ok', label: 'gateway recovers' })
      if (e.kind === 'fault.failure_rate_start') out.push({ t: e.t, kind: 'warn', label: 'gateway error rate spikes' })
      if (e.kind === 'fault.failure_rate_end') out.push({ t: e.t, kind: 'ok', label: 'gateway recovers' })
      if (e.kind === 'fault.worker_kill') out.push({ t: e.t, kind: 'crit', label: `${e.node} killed` })
      if (e.kind === 'fault.worker_restart') out.push({ t: e.t, kind: 'ok', label: `${e.node} restarted` })
      if (e.kind === 'charge.success' && e.orderId) {
        const key = `charge:${e.orderId}`
        if (seen.has(key)) out.push({ t: e.t, kind: 'crit', label: `${e.orderId} double-charged` })
        seen.add(key)
      }
      if (e.kind === 'request.accepted' && e.orderId && typeof e.detail?.total === 'number') {
        requestedTotal.set(e.orderId, e.detail.total)
      }
      if (e.kind === 'db.create' && e.orderId && typeof e.detail?.total === 'number') {
        const requested = requestedTotal.get(e.orderId)
        if (requested != null && requested !== e.detail.total) {
          out.push({ t: e.t, kind: 'crit', label: `${e.orderId} stored with wrong amount` })
        }
      }
    }
    return out
  }, [lastRun])

  const posRef = useRef(scrubberT)
  const [speed, setSpeed] = useState(1)
  const pct = maxT > 0 ? scrubberT / maxT : 0

  useEffect(() => {
    if (!playing) return
    posRef.current = scrubberT === maxT ? 0 : scrubberT
    lastFrameRef.current = performance.now()
    const step = (now: number) => {
      const dt = now - lastFrameRef.current
      lastFrameRef.current = now
      posRef.current += dt * (PLAY_SPEED / 1000) * speed
      if (posRef.current >= maxT) {
        setScrubberT(maxT)
        setPlaying(false)
        return
      }
      setScrubberT(posRef.current)
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed])

  if (!lastRun) {
    return (
      <div
        className="flex h-full items-center justify-center gap-2 px-4 text-[12px]"
        style={{ color: 'var(--fg-faint)' }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="3" cy="8" r="1.6" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="13" cy="8" r="1.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4.5 8 L11.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Run the practice seed to scrub through the incident timeline.
      </div>
    )
  }

  return (
    <div className="flex h-full items-center gap-3 px-4">
      <button
        onClick={() => {
          if (scrubberT >= maxT) setScrubberT(0)
          setPlaying(!playing)
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-all duration-200 hover:-translate-y-px hover:shadow-md active:translate-y-0"
        style={{
          background: 'linear-gradient(135deg, var(--accent-dim) 0%, var(--accent) 100%)',
          boxShadow: playing ? '0 4px 12px rgba(238, 90, 54, 0.32)' : '0 2px 6px rgba(238, 90, 54, 0.18)',
        }}
        aria-label={playing ? 'Pause' : scrubberT >= maxT ? 'Replay' : 'Play'}
        title={playing ? 'Pause' : scrubberT >= maxT ? 'Replay' : 'Play'}
      >
        {playing ? <PauseIcon /> : scrubberT >= maxT ? <ReplayIcon /> : <PlayIcon />}
      </button>

      <button
        onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
        title="Playback speed"
        className="flex h-8 w-10 shrink-0 items-center justify-center rounded-full font-mono text-[10.5px] font-semibold tabular-nums transition-all duration-200 hover:-translate-y-px"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--fg-muted)',
        }}
      >
        {speed}×
      </button>

      <div className="relative flex-1">
        <div className="relative h-8">
          {/* track */}
          <div
            className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full"
            style={{ background: 'var(--border)' }}
          />
          {/* filled */}
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full transition-[width] duration-100"
            style={{
              background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-vivid) 100%)',
              width: `${pct * 100}%`,
            }}
          />
          {/* markers */}
          {markers.map((m, i) => (
            <div
              key={i}
              title={`${fmt(m.t)} — ${m.label}`}
              className="absolute top-1/2 h-2.5 w-1 -translate-y-1/2 -translate-x-1/2 rounded-sm"
              style={{
                left: `${(m.t / maxT) * 100}%`,
                background: m.kind === 'crit' ? 'var(--crit)' : m.kind === 'warn' ? 'var(--warn)' : 'var(--ok)',
                boxShadow: '0 0 0 1.5px var(--bg-elevated)',
              }}
            />
          ))}
          {/* invisible range input for click/drag */}
          <input
            type="range"
            min={0}
            max={maxT}
            step={1}
            value={scrubberT}
            onChange={(e) => {
              setPlaying(false)
              setScrubberT(Number(e.target.value))
            }}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
          />
          {/* playhead */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full"
            style={{
              left: `${pct * 100}%`,
              width: 14,
              height: 14,
              background: 'var(--accent)',
              boxShadow: '0 0 0 3px var(--bg-elevated), 0 0 0 5px rgba(238, 90, 54, 0.30), 0 2px 6px rgba(238, 90, 54, 0.30)',
              transition: playing ? 'none' : 'left 80ms ease',
            }}
          />
        </div>
      </div>

      <div
        className="w-32 shrink-0 text-right font-mono text-[11.5px] tabular-nums"
        style={{ color: 'var(--fg-muted)' }}
      >
        <span style={{ color: 'var(--fg)' }}>{fmt(scrubberT)}</span>
        <span style={{ color: 'var(--fg-faint)' }}> / {fmt(maxT)}</span>
      </div>
    </div>
  )
}