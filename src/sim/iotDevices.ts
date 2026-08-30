import { Scheduler } from '../kernel/scheduler'
import { Rng } from '../kernel/rng'
import { EventLog } from '../kernel/types'
import type { SensorPacket } from '../kernel/types'
import type { IotParams } from '../scenario/types'

export type PacketSink = (packet: SensorPacket) => void

// True line state, independent of whatever the lambda ends up storing —
// used both to derive ss1/ss2 at the source and, later, as ground truth for
// the status-race oracle check.
export function trueLineUpAt(iot: IotParams, lineId: string, t: number): boolean {
  const { statusFlap } = iot
  if (lineId === statusFlap.lineId && t >= statusFlap.downAtMs && t < statusFlap.backUpAtMs) return false
  return true
}

export function isDisconnectedAt(iot: IotParams, lineId: string, t: number): boolean {
  const { disconnectWindow } = iot
  return lineId === disconnectWindow.lineId && t >= disconnectWindow.startMs && t < disconnectWindow.endMs
}

// One heartbeat loop per physical sensor (lines with no `mirrorOf` — a
// mirrored line has no sensor of its own, it only ever sees fan-out copies).
// Counters keep incrementing every tick except during a disconnect window,
// where the sensor is fully silent and nothing is counted.
export function startSensorFleet(opts: {
  scheduler: Scheduler
  log: EventLog
  rng: Rng
  iot: IotParams
  durationMs: number
  sink: PacketSink
}) {
  const { scheduler, log, rng, iot, durationMs, sink } = opts
  const sourceLines = iot.lines.filter((l) => !l.mirrorOf)

  for (const line of sourceLines) {
    let ptc = 0
    let sr1 = 0
    let sr2 = 0
    let restarted = false

    function tick() {
      if (scheduler.now() >= durationMs) return
      const t = scheduler.now()

      if (isDisconnectedAt(iot, line.id, t)) {
        scheduler.schedule(iot.heartbeatIntervalMs, tick)
        return
      }

      if (!restarted && line.id === iot.deviceRestart.lineId && t >= iot.deviceRestart.atMs) {
        ptc = 0
        sr1 = 0
        sr2 = 0
        restarted = true
        log.push(t, 'device.restart', { node: line.id })
      }

      ptc++
      if (rng.bool(iot.rejectRate)) sr2++
      else sr1++

      const up = trueLineUpAt(iot, line.id, t)
      const packet: SensorPacket = {
        tenantId: line.tenantId,
        lineId: line.id,
        pts: t,
        ptc,
        sr1,
        sr2,
        ss1: up ? 1 : 0,
        ss2: up ? 0 : 1,
      }
      log.push(t, 'packet.generated', { node: line.id, detail: { ptc, sr1, sr2, ss1: packet.ss1, ss2: packet.ss2 } })
      sink(packet)

      scheduler.schedule(iot.heartbeatIntervalMs, tick)
    }

    scheduler.schedule(iot.heartbeatIntervalMs, tick)
  }
}
