import { Scheduler } from '../kernel/scheduler'
import { EventLog } from '../kernel/types'
import type { OeeShiftCtx } from '../kernel/types'
import type { IotParams } from '../scenario/types'
import { IotDb } from './iotDb'
import { shiftIdFor } from './oeeShift'

export type GuestShiftHandler = (msg: Record<string, never>, ctx: OeeShiftCtx) => Promise<void>

// Fires every `cronIntervalMs` (1s, matching the real system). Two jobs,
// kept separate on purpose: the harness itself (sealed) samples each line's
// current up/disconnected state every tick and folds it into that line's
// current shift as downtime; only the good/reject counting is handed to the
// guest handler, which is where the counter-reset bug lives.
export function startIotCron(opts: {
  scheduler: Scheduler
  log: EventLog
  db: IotDb
  iot: IotParams
  cronIntervalMs: number
  handler: GuestShiftHandler
}) {
  const { scheduler, log, db, iot, cronIntervalMs, handler } = opts
  const wasDisconnected = new Map<string, boolean>()

  function makeCtx(): OeeShiftCtx {
    return {
      db: {
        packetsSince: (lineId, cursor) => db.packetsSince(lineId, cursor),
        getCursor: (lineId) => db.getCursor(lineId),
        getLastCounters: (lineId) => db.getLastCounters(lineId),
        commitShiftCounts: (lineId, shiftId, delta, o) => db.commitShiftCounts(lineId, shiftId, delta, o),
      },
      lines: () => iot.lines.map((l) => l.id),
      shiftFor: (lineId, ts) => shiftIdFor(iot, lineId, ts),
      now: () => scheduler.now(),
    }
  }

  function tick() {
    const t = scheduler.now()
    log.push(t, 'cron.tick', {})

    for (const line of iot.lines) {
      const status = db.lineStatus(line.id)
      const lastArrival = db.lastArrivalTimeFor(line.id)
      const disconnected = lastArrival == null || t - lastArrival > iot.disconnectTimeoutMs

      if (lastArrival != null && disconnected !== !!wasDisconnected.get(line.id)) {
        log.push(t, disconnected ? 'line.disconnected' : 'line.reconnected', { node: line.id })
      }
      wasDisconnected.set(line.id, disconnected)

      const isUp = !!status?.up && !disconnected
      if (!isUp && lastArrival != null) db.recordDowntimeTick(shiftIdFor(iot, line.id, t), cronIntervalMs)
    }

    scheduler.trackPending(handler({}, makeCtx()).catch(() => {}))
    scheduler.schedule(cronIntervalMs, tick)
  }

  scheduler.schedule(cronIntervalMs, tick)
}
