import { Scheduler } from '../kernel/scheduler'
import { Rng } from '../kernel/rng'
import { EventLog } from '../kernel/types'
import type { OrderRow } from '../kernel/types'

// Behavioral model of a primary DB: rows plus one atomic conditional write
// primitive (models `UPDATE ... WHERE status = $expected`). No SQL engine —
// queries are typed accessors, per the fidelity boundary in the architecture doc.
export class SimDb {
  private rows = new Map<string, OrderRow>()
  private scheduler: Scheduler
  private rng: Rng
  private log: EventLog
  private readLatencyMs: number
  private writeLatencyMs: number

  constructor(scheduler: Scheduler, rng: Rng, log: EventLog, readLatencyMs = 4, writeLatencyMs = 6) {
    this.scheduler = scheduler
    this.rng = rng
    this.log = log
    this.readLatencyMs = readLatencyMs
    this.writeLatencyMs = writeLatencyMs
  }

  insert(row: OrderRow) {
    this.rows.set(row.id, { ...row })
  }

  create(id: string, total: number): Promise<void> {
    return this.scheduler.trackPending(
      new Promise((resolve) => {
        const delay = this.rng.latency(this.writeLatencyMs, 3)
        this.scheduler.schedule(delay, () => {
          this.rows.set(id, { id, status: 'pending', total })
          this.log.push(this.scheduler.now(), 'db.create', { orderId: id, detail: { total } })
          resolve()
        })
      }),
    )
  }

  query(id: string): Promise<OrderRow | undefined> {
    return this.scheduler.trackPending(
      new Promise((resolve) => {
        const delay = this.rng.latency(this.readLatencyMs, 3)
        this.scheduler.schedule(delay, () => {
          const row = this.rows.get(id)
          this.log.push(this.scheduler.now(), 'db.read', { orderId: id, detail: { status: row?.status } })
          resolve(row ? { ...row } : undefined)
        })
      }),
    )
  }

  exec(id: string, patch: Partial<OrderRow>, opts?: { ifStatus?: OrderRow['status'] }): Promise<{ updated: boolean }> {
    return this.scheduler.trackPending(
      new Promise((resolve) => {
        const delay = this.rng.latency(this.writeLatencyMs, 3)
        this.scheduler.schedule(delay, () => {
          const row = this.rows.get(id)
          let updated = false
          if (row && (!opts?.ifStatus || row.status === opts.ifStatus)) {
            Object.assign(row, patch)
            updated = true
            if (patch.status === 'settled') {
              this.log.push(this.scheduler.now(), 'order.settled', { orderId: id })
            }
          }
          this.log.push(this.scheduler.now(), 'db.write', { orderId: id, detail: { patch, updated, guard: opts?.ifStatus } })
          resolve({ updated })
        })
      }),
    )
  }

  snapshot(): OrderRow[] {
    return [...this.rows.values()]
  }
}
