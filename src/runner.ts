import { Scheduler } from './kernel/scheduler'
import { Rng } from './kernel/rng'
import { EventLog } from './kernel/types'
import type { ApiCtx, Ctx } from './kernel/types'
import { SimDb } from './sim/db'
import { SimHttp } from './sim/http'
import { SimQueue } from './sim/queue'
import { WorkerPool } from './sim/workers'
import { startWorkload } from './sim/gateway'
import { compileHandler, CompileError } from './kernel/compile'
import { evaluateInvariants } from './oracle/invariants'
import type { OracleReport } from './oracle/invariants'
import type { Scenario } from './scenario/types'
import type { OrderRow } from './kernel/types'

export interface RunResult {
  seed: number
  log: EventLog
  oracle: OracleReport
  dbSnapshot: OrderRow[]
  error?: string
}

export async function runScenario(scenario: Scenario, code: { api: string; worker: string }, seed: number): Promise<RunResult> {
  const log = new EventLog()

  let apiHandler: (req: { orderId: string; total: number }, ctx: ApiCtx) => Promise<void>
  let workerHandler: (msg: { orderId: string }, ctx: Ctx) => Promise<void>
  try {
    apiHandler = compileHandler(code.api)
    workerHandler = compileHandler(code.worker)
  } catch (err) {
    return {
      seed,
      log,
      dbSnapshot: [],
      oracle: { results: [], metrics: [], passed: false },
      error: err instanceof CompileError ? err.message : String(err),
    }
  }

  const scheduler = new Scheduler()
  const rng = new Rng(seed)
  const { params } = scenario

  const db = new SimDb(scheduler, rng, log, params.dbReadLatencyMs, params.dbWriteLatencyMs)
  const http = new SimHttp(scheduler, rng, log, params.httpBaseLatencyMs, params.spike.latencyMs)
  // a separate third-party dependency from the payment gateway — same
  // latency model, but never coupled to the payment-gateway spike fault
  const riskHttp = new SimHttp(scheduler, rng, log, params.riskCheckLatencyMs, params.riskCheckLatencyMs)
  const queue = new SimQueue(scheduler, log, params.visibilityTimeoutMs)

  scheduler.schedule(params.spike.startMs, () => {
    http.setSpike(true)
    log.push(scheduler.now(), 'fault.latency_spike_start', { node: 'payment-gateway' })
  })
  scheduler.schedule(params.spike.endMs, () => {
    http.setSpike(false)
    log.push(scheduler.now(), 'fault.latency_spike_end', { node: 'payment-gateway' })
  })

  if (params.failureWindow.rate > 0) {
    scheduler.schedule(params.failureWindow.startMs, () => {
      http.setFailureRate(params.failureWindow.rate)
      log.push(scheduler.now(), 'fault.failure_rate_start', { node: 'payment-gateway', detail: { rate: params.failureWindow.rate } })
    })
    scheduler.schedule(params.failureWindow.endMs, () => {
      http.setFailureRate(0)
      log.push(scheduler.now(), 'fault.failure_rate_end', { node: 'payment-gateway' })
    })
  }

  const pool = new WorkerPool(params.workerCount, queue, db, http, log, scheduler, workerHandler)

  scheduler.schedule(params.kill.atMs, () => pool.kill(params.kill.workerIndex))
  scheduler.schedule(params.kill.restartAtMs, () => pool.restart(params.kill.workerIndex))

  pool.start()
  startWorkload({
    scheduler,
    rng,
    log,
    db,
    queue,
    riskHttp,
    handler: apiHandler,
    durationMs: params.durationMs,
    ratePerMs: params.ratePerMs,
  })

  let error: string | undefined
  try {
    await scheduler.run(params.durationMs + params.drainMs)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }
  pool.stop()

  const oracle = evaluateInvariants(log, params.invariants)
  return { seed, log, oracle, error, dbSnapshot: db.snapshot() }
}

export interface SubmitResult {
  runs: RunResult[]
  passRate: number
  passed: boolean
}

export async function submitScenario(scenario: Scenario, code: { api: string; worker: string }): Promise<SubmitResult> {
  const runs: RunResult[] = []
  for (const seed of scenario.hiddenSeeds) {
    runs.push(await runScenario(scenario, code, seed))
  }
  const passCount = runs.filter((r) => !r.error && r.oracle.passed).length
  return { runs, passRate: passCount / runs.length, passed: passCount === runs.length }
}
