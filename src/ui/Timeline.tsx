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

  useEffect(() => {
    if (!playing) return
    // start from wherever the scrubber currently sits, then accumulate in a
    // ref — reading `scrubberT` from the closure would replay the same stale
    // value every frame instead of advancing
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
      <div className="flex h-full items-center px-4 text-xs" style={{ color: 'var(--fg-faint)' }}>
        Run the practice seed to scrub through the incident timeline.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col justify-center gap-2 px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPlaying(!playing)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
          style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-strong)' }}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="9" height="9" viewBox="0 0 9 9"><rect width="3" height="9" fill="currentColor" /><rect x="6" width="3" height="9" fill="currentColor" /></svg>
          ) : (
            <svg width="9" height="9" viewBox="0 0 9 9"><polygon points="0,0 9,4.5 0,9" fill="currentColor" /></svg>
          )}
        </button>
        <button
          onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
          title="Playback speed"
          className="flex h-6 w-9 shrink-0 items-center justify-center rounded font-mono text-[10.5px] tabular-nums"
          style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-strong)', color: 'var(--fg-muted)' }}
        >
          {speed}×
        </button>
        <div className="relative flex-1">
          <div className="relative h-6">
            <div
              className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full"
              style={{ background: 'var(--border)' }}
            />
            <div
              className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
              style={{ background: 'var(--accent)', width: `${(scrubberT / maxT) * 100}%` }}
            />
            {markers.map((m, i) => (
              <div
                key={i}
                title={`${fmt(m.t)} — ${m.label}`}
                className="absolute top-1/2 h-2 w-[2px] -translate-y-1/2 -translate-x-1/2"
                style={{
                  left: `${(m.t / maxT) * 100}%`,
                  background: m.kind === 'crit' ? 'var(--crit)' : m.kind === 'warn' ? 'var(--warn)' : 'var(--ok)',
                }}
              />
            ))}
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
            <div
              className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full"
              style={{ left: `${(scrubberT / maxT) * 100}%`, background: 'var(--accent)', boxShadow: '0 0 0 3px rgba(255,92,51,0.22)' }}
            />
          </div>
        </div>
        <div className="w-32 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>
          {fmt(scrubberT)} / {fmt(maxT)}
        </div>
      </div>
    </div>
  )
}
