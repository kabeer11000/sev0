import { Scheduler } from './kernel/scheduler'
import { Rng } from './kernel/rng'
import { EventLog } from './kernel/types'
import type { OeeIngestCtx, OeeShiftCtx, LineStatusRow, SensorPacket, ShiftTotals } from './kernel/types'
import { IotDb } from './sim/iotDb'
import { startSensorFleet } from './sim/iotDevices'
import { startIotIngest } from './sim/iotIngest'
import { startIotCron } from './sim/iotCron'
import { compileHandler, CompileError } from './kernel/compile'
import { evaluateIotInvariants } from './oracle/iotInvariants'
import type { OracleReport } from './oracle/invariants'
import type { Scenario } from './scenario/types'

export interface IotDbSnapshot {
  packets: SensorPacket[]
  statuses: LineStatusRow[]
  shifts: ShiftTotals[]
}

export interface IotRunResult {
  seed: number
  log: EventLog
  oracle: OracleReport
  dbSnapshot: IotDbSnapshot
  error?: string
}

export async function runIotScenario(
  scenario: Scenario,
  code: { dataEntry: string; statsGen: string },
  seed: number,
): Promise<IotRunResult> {
  const log = new EventLog()
  const emptySnapshot: IotDbSnapshot = { packets: [], statuses: [], shifts: [] }

  let ingestHandler: (packet: SensorPacket, ctx: OeeIngestCtx) => Promise<void>
  let shiftHandler: (msg: Record<string, never>, ctx: OeeShiftCtx) => Promise<void>
  try {
    ingestHandler = compileHandler(code.dataEntry)
    shiftHandler = compileHandler(code.statsGen)
  } catch (err) {
    return {
      seed,
      log,
      dbSnapshot: emptySnapshot,
      oracle: { results: [], metrics: [], passed: false },
      error: err instanceof CompileError ? err.message : String(err),
    }
  }

  const scheduler = new Scheduler()
  const rng = new Rng(seed)
  const { params } = scenario
  const iot = params.iot!

  const db = new IotDb(scheduler, rng, log, params.dbReadLatencyMs, params.dbWriteLatencyMs)
  const dispatch = startIotIngest({ scheduler, rng, log, db, iot, handler: ingestHandler })

  startSensorFleet({ scheduler, log, rng, iot, durationMs: params.durationMs, sink: dispatch })
  startIotCron({ scheduler, log, db, iot, cronIntervalMs: 1000, handler: shiftHandler })

  let error: string | undefined
  try {
    await scheduler.run(params.durationMs + params.drainMs)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  const oracle = evaluateIotInvariants(log, iot)
  return {
    seed,
    log,
    oracle,
    error,
    dbSnapshot: { packets: db.packetSnapshot(), statuses: db.lineStatusSnapshot(), shifts: db.shiftTotalsSnapshot() },
  }
}

export interface IotSubmitResult {
  runs: IotRunResult[]
  passRate: number
  passed: boolean
}

export async function submitIotScenario(scenario: Scenario, code: { dataEntry: string; statsGen: string }): Promise<IotSubmitResult> {
  const runs: IotRunResult[] = []
  for (const seed of scenario.hiddenSeeds) {
    runs.push(await runIotScenario(scenario, code, seed))
  }
  const passCount = runs.filter((r) => !r.error && r.oracle.passed).length
  return { runs, passRate: passCount / runs.length, passed: passCount === runs.length }
}
