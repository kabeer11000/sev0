import { Scheduler } from '../kernel/scheduler'
import { Rng } from '../kernel/rng'
import { EventLog } from '../kernel/types'
import type { ApiCtx } from '../kernel/types'
import { SimDb } from './db'
import { SimQueue } from './queue'
import { SimHttp } from './http'

export type GuestApiHandler = (req: { orderId: string; total: number }, ctx: ApiCtx) => Promise<void>

// Poisson arrivals calling the guest orders-api handler. Modeled as unlimited
// concurrency at this layer — the "×3 instances" in the topology is real
// capacity in production, and it means overlapping invocations are genuinely
// possible: two orders can be mid-handler at the same simulated instant, so
// any state a handler keeps outside its own call is shared across them.
export function startWorkload(opts: {
  scheduler: Scheduler
  rng: Rng
  log: EventLog
  db: SimDb
  queue: SimQueue
  riskHttp: SimHttp
  handler: GuestApiHandler
  durationMs: number
  ratePerMs: number
}) {
  const { scheduler, rng, log, db, queue, riskHttp, handler, durationMs, ratePerMs } = opts
  let seq = 0
  const startedAt = scheduler.now()

  function makeCtx(): ApiCtx {
    return {
      db: {
        create: (id, total) => db.create(id, total),
        query: (id) => db.query(id),
        exec: (id, patch, o) => db.exec(id, patch, o),
      },
      http: { post: (endpoint, body, o) => riskHttp.post(endpoint, body, o) },
      queue: { publish: (orderId) => queue.enqueue(orderId) },
      now: () => scheduler.now(),
    }
  }

  function tick() {
    if (scheduler.now() - startedAt >= durationMs) return

    const orderId = `ord-${++seq}`
    const total = Math.round(rng.next() * 12000 + 800) // cents
    log.push(scheduler.now(), 'request.accepted', { orderId, detail: { total } })

    scheduler.trackPending(
      handler({ orderId, total }, makeCtx())
        .then(() => log.push(scheduler.now(), 'request.completed', { orderId }))
        .catch((err) => log.push(scheduler.now(), 'request.failed', { orderId, detail: { error: String(err) } })),
    )

    scheduler.schedule(rng.exponential(ratePerMs), tick)
  }

  scheduler.schedule(rng.exponential(ratePerMs), tick)
}
