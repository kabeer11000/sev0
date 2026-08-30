import { Scheduler } from '../kernel/scheduler'
import { Rng } from '../kernel/rng'
import { EventLog } from '../kernel/types'
import type { OeeIngestCtx, SensorPacket } from '../kernel/types'
import type { IotParams } from '../scenario/types'
import { IotDb } from './iotDb'

export type GuestIngestHandler = (packet: SensorPacket, ctx: OeeIngestCtx) => Promise<void>

// Models iot-core handing a packet to dataentry-lambda: variable
// network/queueing delay before the guest handler ever runs, plus the
// (sealed) static fan-out — one physical sensor's packet is duplicated,
// unmodified in content but re-labeled, onto every line that mirrors it.
// Each fan-out target gets its own independent invocation and its own
// independent transit delay, exactly as if it were its own subscriber.
export function startIotIngest(opts: {
  scheduler: Scheduler
  rng: Rng
  log: EventLog
  db: IotDb
  iot: IotParams
  handler: GuestIngestHandler
}): (packet: SensorPacket) => void {
  const { scheduler, rng, db, iot, handler } = opts

  const mirrorTargets = new Map<string, string[]>()
  for (const line of iot.lines) {
    if (!line.mirrorOf) continue
    mirrorTargets.set(line.mirrorOf, [...(mirrorTargets.get(line.mirrorOf) ?? []), line.id])
  }

  function makeCtx(): OeeIngestCtx {
    return {
      db: {
        insertPacket: (p) => db.insertPacket(p),
        writeLineStatus: (id, up, ts, o) => db.writeLineStatus(id, up, ts, o),
      },
      now: () => scheduler.now(),
    }
  }

  function dispatchOne(lineId: string, packet: SensorPacket) {
    const targetPacket: SensorPacket = { ...packet, lineId }
    const { statusFlap } = iot
    // the one heartbeat right before the flip — its delivery must be
    // deliberately delayed past the 'down' packet that follows it
    const isStaleCandidate =
      lineId === statusFlap.lineId &&
      targetPacket.ss1 === 1 &&
      targetPacket.pts < statusFlap.downAtMs &&
      targetPacket.pts >= statusFlap.downAtMs - iot.heartbeatIntervalMs

    const baseDelay = rng.latency(iot.ingestJitterMs, 3)
    const delay = isStaleCandidate ? baseDelay + statusFlap.delayedPacketLatencyMs : baseDelay

    scheduler.schedule(delay, () => {
      scheduler.trackPending(handler(targetPacket, makeCtx()).catch(() => {}))
    })
  }

  return function dispatch(packet: SensorPacket) {
    dispatchOne(packet.lineId, packet)
    for (const targetId of mirrorTargets.get(packet.lineId) ?? []) {
      dispatchOne(targetId, packet)
    }
  }
}
