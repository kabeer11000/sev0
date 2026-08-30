import { Scheduler } from '../kernel/scheduler'
import { Rng } from '../kernel/rng'
import { EventLog } from '../kernel/types'
import type { LineCounters, LineStatusRow, SensorPacket, ShiftTotals } from '../kernel/types'

// Behavioral model of the OEE store: raw packets per line, a guarded
// line-status table, a continuous per-line counter chain (for reset-aware
// delta computation), and per-shift running totals. No SQL engine — same
// fidelity boundary as SimDb.
export class IotDb {
  private packets: SensorPacket[] = []
  private statuses = new Map<string, LineStatusRow>()
  private cursors = new Map<string, number>()
  private lastCounters = new Map<string, LineCounters>()
  private lastArrivalTime = new Map<string, number>()
  private shiftTotals = new Map<string, ShiftTotals>()
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

  insertPacket(packet: SensorPacket): Promise<void> {
    return this.scheduler.trackPending(
      new Promise((resolve) => {
        const delay = this.rng.latency(this.writeLatencyMs, 3)
        this.scheduler.schedule(delay, () => {
          this.packets.push({ ...packet })
          this.lastArrivalTime.set(packet.lineId, this.scheduler.now())
          this.log.push(this.scheduler.now(), 'packet.ingested', {
            node: packet.lineId,
            detail: { pts: packet.pts, ptc: packet.ptc, sr1: packet.sr1, sr2: packet.sr2, ss1: packet.ss1, ss2: packet.ss2 },
          })
          resolve()
        })
      }),
    )
  }

  writeLineStatus(lineId: string, up: boolean, ts: number, opts?: { ifNewerThan?: boolean }): Promise<{ updated: boolean }> {
    return this.scheduler.trackPending(
      new Promise((resolve) => {
        const delay = this.rng.latency(this.writeLatencyMs, 3)
        this.scheduler.schedule(delay, () => {
          const existing = this.statuses.get(lineId)
          const guardPasses = !opts?.ifNewerThan || !existing || ts > existing.ts
          let updated = false
          if (guardPasses) {
            this.statuses.set(lineId, { lineId, up, ts })
            updated = true
          }
          this.log.push(this.scheduler.now(), guardPasses ? 'line.status.write' : 'line.status.stale', {
            node: lineId,
            detail: { up, ts, guarded: !!opts?.ifNewerThan },
          })
          resolve({ updated })
        })
      }),
    )
  }

  packetsSince(lineId: string, cursorPts: number): Promise<SensorPacket[]> {
    return this.scheduler.trackPending(
      new Promise((resolve) => {
        const delay = this.rng.latency(this.readLatencyMs, 3)
        this.scheduler.schedule(delay, () => {
          resolve(
            this.packets
              .filter((p) => p.lineId === lineId && p.pts > cursorPts)
              .sort((a, b) => a.pts - b.pts)
              .map((p) => ({ ...p })),
          )
        })
      }),
    )
  }

  getCursor(lineId: string): Promise<number> {
    return this.scheduler.trackPending(
      new Promise((resolve) => {
        const delay = this.rng.latency(this.readLatencyMs, 3)
        this.scheduler.schedule(delay, () => resolve(this.cursors.get(lineId) ?? 0))
      }),
    )
  }

  getLastCounters(lineId: string): Promise<LineCounters | undefined> {
    return this.scheduler.trackPending(
      new Promise((resolve) => {
        const delay = this.rng.latency(this.readLatencyMs, 3)
        this.scheduler.schedule(delay, () => resolve(this.lastCounters.get(lineId)))
      }),
    )
  }

  commitShiftCounts(
    lineId: string,
    shiftId: string,
    delta: { good: number; reject: number },
    opts: { lastCounters: LineCounters; newCursor: number },
  ): Promise<void> {
    return this.scheduler.trackPending(
      new Promise((resolve) => {
        const delay = this.rng.latency(this.writeLatencyMs, 3)
        this.scheduler.schedule(delay, () => {
          const totals = this.shiftTotals.get(shiftId) ?? { shiftId, good: 0, reject: 0, downtimeMs: 0 }
          totals.good += delta.good
          totals.reject += delta.reject
          this.shiftTotals.set(shiftId, totals)
          this.cursors.set(lineId, opts.newCursor)
          this.lastCounters.set(lineId, opts.lastCounters)
          this.log.push(this.scheduler.now(), 'shift.commit', { node: lineId, detail: { shiftId, delta } })
          resolve()
        })
      }),
    )
  }

  // privileged — not exposed to guest ctx. Called once per cron tick per
  // line by the (sealed) harness to fold ss1/ss2 + disconnect downtime into
  // whichever shift is current right now.
  recordDowntimeTick(shiftId: string, tickMs: number) {
    const totals = this.shiftTotals.get(shiftId) ?? { shiftId, good: 0, reject: 0, downtimeMs: 0 }
    totals.downtimeMs += tickMs
    this.shiftTotals.set(shiftId, totals)
  }

  lineStatus(lineId: string): LineStatusRow | undefined {
    return this.statuses.get(lineId)
  }

  lastArrivalTimeFor(lineId: string): number | undefined {
    return this.lastArrivalTime.get(lineId)
  }

  packetSnapshot(): SensorPacket[] {
    return [...this.packets]
  }

  lineStatusSnapshot(): LineStatusRow[] {
    return [...this.statuses.values()]
  }

  shiftTotalsSnapshot(): ShiftTotals[] {
    return [...this.shiftTotals.values()]
  }
}
