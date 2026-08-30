export type EventKind =
  | 'sim.start'
  | 'sim.end'
  | 'request.accepted'
  | 'request.completed'
  | 'request.failed'
  | 'db.read'
  | 'db.write'
  | 'db.create'
  | 'queue.enqueue'
  | 'queue.deliver'
  | 'queue.redeliver'
  | 'queue.ack'
  | 'queue.visibility_timeout'
  | 'http.call'
  | 'http.result'
  | 'fault.latency_spike_start'
  | 'fault.latency_spike_end'
  | 'fault.failure_rate_start'
  | 'fault.failure_rate_end'
  | 'fault.worker_kill'
  | 'fault.worker_restart'
  | 'charge.attempt'
  | 'charge.success'
  | 'charge.deduped'
  | 'charge.failed'
  | 'order.settled'
  | 'packet.generated'
  | 'packet.ingested'
  | 'line.status.write'
  | 'line.status.stale'
  | 'line.disconnected'
  | 'line.reconnected'
  | 'device.restart'
  | 'cron.tick'
  | 'shift.commit'
  | 'frontend.getStats'

export interface SimEvent {
  t: number // simulation time, ms
  seq: number // insertion sequence — deterministic tiebreak
  kind: EventKind
  node?: string
  orderId?: string
  detail?: Record<string, unknown>
}

export class EventLog {
  private events: SimEvent[] = []
  private seq = 0

  push(t: number, kind: EventKind, fields: Omit<SimEvent, 't' | 'seq' | 'kind'> = {}) {
    this.events.push({ t, seq: this.seq++, kind, ...fields })
  }

  all(): readonly SimEvent[] {
    return this.events
  }

  upTo(t: number): SimEvent[] {
    return this.events.filter((e) => e.t <= t)
  }

  get lastTime(): number {
    return this.events.length ? this.events[this.events.length - 1].t : 0
  }
}

export interface OrderRow {
  id: string
  status: 'pending' | 'settled'
  total: number
}

export interface DbApi {
  query(id: string): Promise<OrderRow | undefined>
  exec(id: string, patch: Partial<OrderRow>, opts?: { ifStatus?: OrderRow['status'] }): Promise<{ updated: boolean }>
}

export interface HttpApi {
  post(
    endpoint: string,
    body: Record<string, unknown>,
    opts?: { idempotencyKey?: string },
  ): Promise<{ ok: boolean; charged: boolean; status: number }>
}

// orders-api/handler.ts runs with this ctx — producer side of the queue
export interface ApiCtx {
  db: DbApi & { create(id: string, total: number): Promise<void> }
  http: HttpApi
  queue: { publish(orderId: string): void }
  now(): number
}

// worker/consume.ts runs with this ctx — consumer side of the queue
export interface Ctx {
  db: DbApi
  http: HttpApi
  queue: { ack(): void }
  now(): number
}

export interface SensorPacket {
  tenantId: string
  lineId: string
  pts: number // packet timestamp
  ptc: number // cumulative packet counter — resets to 0 on device restart
  sr1: number // cumulative good-part counter — same reset behavior as ptc
  sr2: number // cumulative reject counter — same reset behavior as ptc
  ss1: 0 | 1 // run signal
  ss2: 0 | 1 // fault signal
}

export interface LineStatusRow {
  lineId: string
  up: boolean
  ts: number
}

export interface LineCounters {
  sr1: number
  sr2: number
}

export interface ShiftTotals {
  shiftId: string
  good: number
  reject: number
  downtimeMs: number
}

export interface IotDb {
  insertPacket(packet: SensorPacket): Promise<void>
  writeLineStatus(lineId: string, up: boolean, ts: number, opts?: { ifNewerThan?: boolean }): Promise<{ updated: boolean }>
  packetsSince(lineId: string, cursorPts: number): Promise<SensorPacket[]>
  getCursor(lineId: string): Promise<number>
  getLastCounters(lineId: string): Promise<LineCounters | undefined>
  commitShiftCounts(
    lineId: string,
    shiftId: string,
    delta: { good: number; reject: number },
    opts: { lastCounters: LineCounters; newCursor: number },
  ): Promise<void>
}

// dataentry-lambda/handler.ts runs with this ctx — one invocation per ingested packet
// (once per line it applies to — the sim invokes this per fan-out target automatically)
export interface OeeIngestCtx {
  db: Pick<IotDb, 'insertPacket' | 'writeLineStatus'>
  now(): number
}

// shift-aggregator/handler.ts runs with this ctx — one invocation per cron tick
export interface OeeShiftCtx {
  db: Pick<IotDb, 'packetsSince' | 'getCursor' | 'getLastCounters' | 'commitShiftCounts'>
  lines(): string[]
  shiftFor(lineId: string, ts: number): string
  now(): number
}
