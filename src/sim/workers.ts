import { Scheduler } from '../kernel/scheduler'
import { EventLog } from '../kernel/types'
import type { Ctx, OrderRow } from '../kernel/types'
import { SimDb } from './db'
import { SimHttp } from './http'
import { SimQueue } from './queue'

export type GuestWorkerHandler = (msg: { orderId: string }, ctx: Ctx) => Promise<void>

let DEBUG = false
export function setWorkerPoolDebug(v: boolean) {
  DEBUG = v
}

// A pool of worker processes pulling from one queue. Killing a worker
// abandons whatever it was mid-processing — any ctx call issued before the
// kill resolves into a promise that never settles, exactly like a crashed
// process never returning from a syscall. The message it held is redelivered
// once its visibility timeout lapses, same as SQS/SNS-style queues.
export class WorkerPool {
  private alive: boolean[]
  private generation: number[]
  private restartWaiters: Array<Array<() => void>>
  private generationWaiters: Array<Array<() => void>>
  private stopped = false
  private count: number
  private queue: SimQueue
  private db: SimDb
  private http: SimHttp
  private log: EventLog
  private scheduler: Scheduler
  private handler: GuestWorkerHandler

  constructor(
    count: number,
    queue: SimQueue,
    db: SimDb,
    http: SimHttp,
    log: EventLog,
    scheduler: Scheduler,
    handler: GuestWorkerHandler,
  ) {
    this.count = count
    this.queue = queue
    this.db = db
    this.http = http
    this.log = log
    this.scheduler = scheduler
    this.handler = handler
    this.alive = Array(count).fill(true)
    this.generation = Array(count).fill(0)
    this.restartWaiters = Array.from({ length: count }, () => [])
    this.generationWaiters = Array.from({ length: count }, () => [])
  }

  start() {
    for (let i = 0; i < this.count; i++) void this.loop(i)
  }

  stop() {
    this.stopped = true
  }

  kill(workerIndex: number) {
    this.alive[workerIndex] = false
    this.generation[workerIndex]++
    this.log.push(this.scheduler.now(), 'fault.worker_kill', { node: `worker-${workerIndex}` })
    this.generationWaiters[workerIndex].splice(0).forEach((r) => r())
  }

  restart(workerIndex: number) {
    this.alive[workerIndex] = true
    this.log.push(this.scheduler.now(), 'fault.worker_restart', { node: `worker-${workerIndex}` })
    this.restartWaiters[workerIndex].splice(0).forEach((r) => r())
  }

  private waitUntilAlive(i: number): Promise<void> {
    if (this.alive[i]) return Promise.resolve()
    return new Promise((resolve) => this.restartWaiters[i].push(resolve))
  }

  private waitForGenerationChange(i: number, gen: number): Promise<void> {
    if (this.generation[i] !== gen) return Promise.resolve()
    return new Promise((resolve) => this.generationWaiters[i].push(resolve))
  }

  private makeCtx(workerIndex: number, generation: number, messageId: string): Ctx {
    const guard = <T>(p: Promise<T>): Promise<T> =>
      p.then((v) => (this.generation[workerIndex] === generation ? v : new Promise<T>(() => {})))

    return {
      db: {
        query: (id) => guard(this.db.query(id)),
        exec: (id, patch, opts) => guard(this.db.exec(id, patch, opts)),
      },
      http: {
        post: (endpoint, body, opts) => guard(this.http.post(endpoint, body, opts)),
      },
      queue: {
        ack: () => {
          if (this.generation[workerIndex] === generation) this.queue.ack(messageId)
        },
      },
      now: () => this.scheduler.now(),
    }
  }

  private async loop(i: number) {
    while (!this.stopped) {
      await this.waitUntilAlive(i)
      // captured before the wait: a kill that lands while this worker is
      // idle-waiting on take() must still abandon whatever it picks up
      const generation = this.generation[i]
      const msg = await this.queue.take()
      if (DEBUG) console.log(`  [worker-${i} gen${generation}] picked up ${msg.orderId} @ ${this.scheduler.now().toFixed(0)}`)
      const ctx = this.makeCtx(i, generation, msg.id)

      const handlerSettled = this.handler({ orderId: msg.orderId }, ctx).catch(() => {
        // an uncaught guest exception is a failed attempt, not a crash —
        // no ack means the message is redelivered on visibility timeout
      })

      // tracked as pending only until the race resolves — a zombie handler
      // left running after a kill must not keep the scheduler alive forever
      await this.scheduler.trackPending(Promise.race([handlerSettled, this.waitForGenerationChange(i, generation)]))
    }
  }
}

export function insertPendingOrder(db: SimDb, orderId: string, total: number): OrderRow {
  const row: OrderRow = { id: orderId, status: 'pending', total }
  db.insert(row)
  return row
}
