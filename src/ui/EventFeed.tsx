import { useMemo } from 'react'
import { useSev0Store } from '../store'
import type { SimEvent } from '../kernel/types'

const LABELS: Partial<Record<SimEvent['kind'], string>> = {
  'fault.latency_spike_start': 'ALERT  payment-gateway p99 latency spiking',
  'fault.latency_spike_end': 'INFO   payment-gateway latency recovered',
  'fault.failure_rate_start': 'ALERT  payment-gateway error rate elevated',
  'fault.failure_rate_end': 'INFO   payment-gateway error rate recovered',
  'fault.worker_kill': 'ALERT  worker killed',
  'fault.worker_restart': 'INFO   worker restarted',
  'queue.visibility_timeout': 'WARN   message visibility timeout, redelivering',
  'queue.redeliver': 'WARN   message redelivered',
  'charge.success': 'INFO   charge succeeded',
  'charge.deduped': 'INFO   charge deduped (idempotency key hit)',
  'charge.failed': 'WARN   charge attempt failed',
  'request.failed': 'WARN   checkout request failed',
  'device.status.stale': 'INFO   stale device-status write rejected by guard',
  'stats.commit_skipped': 'INFO   stats commit skipped — cursor already advanced',
}

const SEVERITY: Partial<Record<SimEvent['kind'], 'crit' | 'warn' | 'ok'>> = {
  'fault.latency_spike_start': 'warn',
  'fault.failure_rate_start': 'warn',
  'fault.worker_kill': 'crit',
  'queue.visibility_timeout': 'warn',
  'queue.redeliver': 'warn',
  'charge.failed': 'warn',
  'request.failed': 'crit',
  'fault.latency_spike_end': 'ok',
  'fault.failure_rate_end': 'ok',
  'fault.worker_restart': 'ok',
  'charge.deduped': 'ok',
  'device.status.stale': 'ok',
  'stats.commit_skipped': 'ok',
}

export function EventFeed() {
  const lastRun = useSev0Store((s) => s.lastRun)
  const scrubberT = useSev0Store((s) => s.scrubberT)
  const showToast = useSev0Store((s) => s.showToast)

  const rows = useMemo(() => {
    if (!lastRun) return []
    const withFlags: Array<SimEvent & { double?: boolean; mismatch?: boolean; outOfOrder?: boolean }> = []
    const seen = new Set<string>()
    const requestedTotal = new Map<string, number>()
    const lastAcceptedTsByDevice = new Map<string, number>()
    for (const e of lastRun.log.all()) {
      if (e.t > scrubberT) break
      if (e.kind === 'request.accepted' && e.orderId && typeof e.detail?.total === 'number') {
        requestedTotal.set(e.orderId, e.detail.total)
      }
      let mismatch = false
      if (e.kind === 'db.create' && e.orderId && typeof e.detail?.total === 'number') {
        const requested = requestedTotal.get(e.orderId)
        mismatch = requested != null && requested !== e.detail.total
      }
      let outOfOrder = false
      if (e.kind === 'device.status.write' && e.node && typeof e.detail?.ts === 'number') {
        const last = lastAcceptedTsByDevice.get(e.node)
        outOfOrder = last != null && e.detail.ts < last
        lastAcceptedTsByDevice.set(e.node, Math.max(last ?? -Infinity, e.detail.ts))
      }
      if (!LABELS[e.kind] && !mismatch && !outOfOrder) continue
      let double = false
      if (e.kind === 'charge.success' && e.orderId) {
        if (seen.has(e.orderId)) double = true
        seen.add(e.orderId)
      }
      withFlags.push({ ...e, double, mismatch, outOfOrder })
    }
    return withFlags.slice(-200).reverse()
  }, [lastRun, scrubberT])

  if (!lastRun) return null

  return (
    <div className="flex h-full flex-col overflow-y-auto font-mono text-[11px]">
      {rows.length === 0 && (
        <div className="px-4 py-3" style={{ color: 'var(--fg-faint)' }}>
          No signals yet at this point in time.
        </div>
      )}
      {rows.map((e) => {
        const flagged = e.double || e.mismatch || e.outOfOrder
        const sev = flagged ? 'crit' : SEVERITY[e.kind] ?? 'ok'
        const color = sev === 'crit' ? 'var(--crit)' : sev === 'warn' ? 'var(--warn)' : 'var(--fg-muted)'
        const label = e.double
          ? 'ALERT  duplicate charge'
          : e.mismatch
            ? "ALERT  stored amount doesn't match what was requested"
            : e.outOfOrder
              ? 'ALERT  stale reading overwrote a fresher device status'
              : LABELS[e.kind]
        const copyId = e.orderId ?? (e.kind.startsWith('device.') || e.kind.startsWith('reading.') ? e.node : undefined)
        return (
          <div key={`${e.seq}`} className="flex gap-3 border-b px-4 py-1.5" style={{ borderColor: 'var(--border)' }}>
            <span className="shrink-0 tabular-nums" style={{ color: 'var(--fg-faint)' }}>
              {(e.t / 1000).toFixed(1)}s
            </span>
            <span style={{ color }}>{label}</span>
            {copyId && (
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(copyId)
                  showToast(`${copyId} copied — paste into any terminal's logs/peek/select`)
                }}
                className="hover:underline"
                style={{ color: flagged ? color : 'var(--accent)' }}
                title={`Copy ${copyId}`}
              >
                {copyId}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
