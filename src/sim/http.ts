import { Scheduler } from '../kernel/scheduler'
import { Rng } from '../kernel/rng'
import { EventLog } from '../kernel/types'

// Behavioral model of the external payment gateway. Idempotency-key dedup
// lives on the "provider" side, exactly like a real processor — the guest
// code only benefits from it if it actually sends a key.
export class SimHttp {
  private chargedKeys = new Map<string, { ok: true; charged: true; status: 200 }>()
  private spikeActive = false
  private failureRate = 0
  callCount = 0
  private scheduler: Scheduler
  private rng: Rng
  private log: EventLog
  private baseLatencyMs: number
  private spikeLatencyMs: number

  constructor(scheduler: Scheduler, rng: Rng, log: EventLog, baseLatencyMs = 120, spikeLatencyMs = 9000) {
    this.scheduler = scheduler
    this.rng = rng
    this.log = log
    this.baseLatencyMs = baseLatencyMs
    this.spikeLatencyMs = spikeLatencyMs
  }

  setSpike(active: boolean) {
    this.spikeActive = active
  }

  setFailureRate(rate: number) {
    this.failureRate = rate
  }

  post(
    endpoint: string,
    body: Record<string, unknown>,
    opts?: { idempotencyKey?: string },
  ): Promise<{ ok: boolean; charged: boolean; status: number }> {
    this.callCount++
    return this.scheduler.trackPending(
      new Promise((resolve) => {
        const delay = this.spikeActive
          ? this.rng.latency(this.spikeLatencyMs, 2)
          : this.rng.latency(this.baseLatencyMs, 4)

        const calledAt = this.scheduler.now()
        const orderId = String(body.orderId ?? '')
        this.log.push(calledAt, 'http.call', { orderId, detail: { endpoint } })

        this.scheduler.schedule(delay, () => {
          const t = this.scheduler.now()
          const key = opts?.idempotencyKey

          if (endpoint !== 'payments.charge') {
            this.log.push(t, 'http.result', { orderId, detail: { endpoint, tookMs: Math.round(t - calledAt) } })
            resolve({ ok: true, charged: false, status: 200 })
            return
          }

          this.log.push(t, 'charge.attempt', { orderId, detail: { key: key ?? null } })

          if (key && this.chargedKeys.has(key)) {
            this.log.push(t, 'charge.deduped', { orderId, detail: { key } })
            resolve(this.chargedKeys.get(key)!)
            return
          }

          if (this.failureRate > 0 && this.rng.bool(this.failureRate)) {
            this.log.push(t, 'charge.failed', { orderId, detail: { key: key ?? null } })
            resolve({ ok: false, charged: false, status: 503 })
            return
          }

          const result = { ok: true as const, charged: true as const, status: 200 as const }
          if (key) this.chargedKeys.set(key, result)
          this.log.push(t, 'charge.success', { orderId, detail: { key: key ?? null } })
          resolve(result)
        })
      }),
    )
  }
}
