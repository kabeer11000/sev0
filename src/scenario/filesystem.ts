import type { Scenario } from './types'

export interface VFile {
  path: string
  editable: boolean
  language: 'typescript' | 'json' | 'yaml' | 'markdown'
}

function yamlScalar(v: unknown): string {
  if (typeof v === 'string') return v
  return String(v)
}

function buildTopologyYaml(scenario: Scenario): string {
  const p = scenario.params
  const lines: string[] = []
  lines.push(`# generated from the live scenario spec — read-only`)
  lines.push(`case: ${scenario.caseId}`)
  lines.push(`severity: ${scenario.severity}`)
  lines.push(``)
  lines.push(`topology:`)
  for (const n of scenario.topology.nodes) {
    lines.push(`  - id: ${n.id}`)
    lines.push(`    kind: ${n.kind}`)
    lines.push(`    sealed: ${n.sealed}`)
  }
  lines.push(``)
  if (scenario.domain === 'iot') {
    const iot = p.iot!
    lines.push(`workload:`)
    lines.push(`  duration_ms: ${p.durationMs}`)
    lines.push(`  heartbeat_interval_ms: ${iot.heartbeatIntervalMs}`)
    lines.push(`  ingest_jitter_ms: ${iot.ingestJitterMs}`)
    lines.push(`  disconnect_timeout_ms: ${iot.disconnectTimeoutMs}`)
    lines.push(``)
    lines.push(`tenants:`)
    for (const tenant of iot.tenants) {
      lines.push(`  - id: ${tenant.id}`)
      lines.push(`    day_length_ms: ${tenant.dayLengthMs}`)
      lines.push(`    day_offset_ms: ${tenant.dayOffsetMs}`)
      lines.push(`    shifts: ${tenant.shiftLabels.join(', ')}`)
    }
    lines.push(``)
    lines.push(`lines:`)
    for (const line of iot.lines) {
      lines.push(`  - id: ${line.id}`)
      lines.push(`    tenant: ${line.tenantId}`)
      lines.push(`    ideal_cycle_ms: ${line.idealCycleMs}`)
      if (line.mirrorOf) lines.push(`    mirror_of: ${line.mirrorOf}`)
    }
    lines.push(``)
    lines.push(`cron:`)
    lines.push(`  interval_ms: 1000`)
    lines.push(``)
    lines.push(`db:`)
    lines.push(`  read_latency_ms: ${p.dbReadLatencyMs}`)
    lines.push(`  write_latency_ms: ${p.dbWriteLatencyMs}`)
    lines.push(``)
  } else {
    lines.push(`workload:`)
    lines.push(`  duration_ms: ${p.durationMs}`)
    lines.push(`  rate_per_ms: ${yamlScalar(p.ratePerMs)}`)
    lines.push(`  worker_count: ${p.workerCount}`)
    lines.push(``)
    lines.push(`queue:`)
    lines.push(`  visibility_timeout_ms: ${p.visibilityTimeoutMs}`)
    lines.push(``)
    lines.push(`db:`)
    lines.push(`  read_latency_ms: ${p.dbReadLatencyMs}`)
    lines.push(`  write_latency_ms: ${p.dbWriteLatencyMs}`)
    lines.push(``)
    lines.push(`risk_engine:`)
    lines.push(`  latency_ms: ${p.riskCheckLatencyMs}`)
    lines.push(``)
  }
  lines.push(`faults:`)
  if (p.spike.endMs > p.spike.startMs) {
    lines.push(`  latency_spike:`)
    lines.push(`    target: payment-gateway`)
    lines.push(`    start_ms: ${p.spike.startMs}`)
    lines.push(`    end_ms: ${p.spike.endMs}`)
    lines.push(`    latency_ms: ${p.spike.latencyMs}`)
  }
  if (p.failureWindow.rate > 0) {
    lines.push(`  failure_rate:`)
    lines.push(`    target: payment-gateway`)
    lines.push(`    start_ms: ${p.failureWindow.startMs}`)
    lines.push(`    end_ms: ${p.failureWindow.endMs}`)
    lines.push(`    rate: ${p.failureWindow.rate}`)
  }
  if (p.kill.restartAtMs > p.kill.atMs) {
    lines.push(`  worker_kill:`)
    lines.push(`    target: worker-${p.kill.workerIndex}`)
    lines.push(`    at_ms: ${p.kill.atMs}`)
    lines.push(`    restart_ms: ${p.kill.restartAtMs}`)
  }
  if (p.iot) {
    lines.push(`  device_restart:`)
    lines.push(`    target: ${p.iot.deviceRestart.lineId}`)
    lines.push(`    at_ms: ${p.iot.deviceRestart.atMs}`)
    lines.push(`  status_flap:`)
    lines.push(`    target: ${p.iot.statusFlap.lineId}`)
    lines.push(`    down_at_ms: ${p.iot.statusFlap.downAtMs}`)
    lines.push(`    back_up_at_ms: ${p.iot.statusFlap.backUpAtMs}`)
    lines.push(`  disconnect_window:`)
    lines.push(`    target: ${p.iot.disconnectWindow.lineId}`)
    lines.push(`    start_ms: ${p.iot.disconnectWindow.startMs}`)
    lines.push(`    end_ms: ${p.iot.disconnectWindow.endMs}`)
  }
  lines.push(``)
  lines.push(`invariants:`)
  lines.push(`  settle_window_ms: ${p.invariants.settleWindowMs}`)
  lines.push(`  latency_budget_ms: ${p.invariants.latencyBudgetMs}  # informational, not gated`)
  lines.push(
    `  external_call_budget: ${p.invariants.externalCallBudget}${p.invariants.gateExternalCallBudget ? '' : '  # informational, not gated'}`,
  )
  return lines.join('\n')
}

const AUTH_MIDDLEWARE = `import type { Request, Response, NextFunction } from '../types'

// Verifies the session JWT issued by the gateway. Sealed — the gateway
// already stripped invalid tokens before a request reaches here.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.headers.authorization) {
    throw new Error('missing authorization header')
  }
  next()
}
`

const RATE_LIMIT_MIDDLEWARE = `import type { Request, Response, NextFunction } from '../types'

const WINDOW_MS = 1000
const MAX_PER_WINDOW = 50
const hits = new Map<string, number[]>()

// Per-customer sliding window. Unrelated to the queue's own backpressure —
// this only protects orders-api from a single noisy customer.
export function rateLimit(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers['x-customer-id'] ?? 'anonymous'
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(key, recent)
  if (recent.length > MAX_PER_WINDOW) throw new Error('rate limited')
  next()
}
`

const ROUTES_TS = `import { Router } from '../http/router'
import { requireAuth } from './middleware/auth'
import { rateLimit } from './middleware/rateLimit'
import { handle } from './handler'

const router = new Router()

router.post('/v1/checkout', requireAuth, rateLimit, handle)

export default router
`

const API_TYPES_TS = `export interface Order {
  id: string
  status: 'pending' | 'settled'
  total: number
}

export interface CheckoutRequest {
  orderId: string
  total: number
}

export interface Request {
  headers: Record<string, string | undefined>
  body: CheckoutRequest
}

export interface Response {
  status(code: number): Response
  json(body: unknown): void
}

export type NextFunction = () => void
`

const API_README = `# orders-api

Accepts checkout requests, writes the order row, and publishes to the
\`payments\` queue for async settlement.

Owned by: checkout-platform
On-call: #checkout-platform-oncall

## Local dev

\`\`\`
npm run dev
\`\`\`

## Notes

- This service is stateless — safe to scale horizontally.
- Settlement is async. This endpoint does NOT wait for payment to complete.
`

const WORKER_RETRY_TS = `// Shared backoff helper for worker consumers. Not currently wired into
// worker/consume.ts — left here from the last on-call rotation's WIP fix.
export function backoffMs(attempt: number, baseMs = 200): number {
  const jitter = Math.random() * baseMs
  return Math.min(30_000, baseMs * 2 ** attempt) + jitter
}
`

const WORKER_TYPES_TS = `export interface PaymentMessage {
  orderId: string
}

export interface ChargeResult {
  ok: boolean
  charged: boolean
  status: number
}
`

const WORKER_README = `# payments-worker

Consumes the \`payments\` queue and settles orders against the payment
gateway. At-least-once delivery — the queue WILL redeliver a message if it
isn't acked within the visibility timeout.

Owned by: checkout-platform
On-call: #checkout-platform-oncall

## Notes

- payment-gateway is a third-party dependency. We do not control its latency.
- This consumer must be safe under concurrent delivery of the same message.
`

const QUEUE_CONFIG_JSON = `{
  "queue": "payments",
  "deliveryGuarantee": "at-least-once",
  "deadLetterQueue": "payments-dlq",
  "maxReceiveCount": 20,
  "encryption": "sse-kms"
}
`

// No import/export in this file on purpose — that makes it an ambient
// script rather than a module, so every interface below is globally visible
// to the editor's type checker without either editable file importing
// anything (the compiled runtime code has no module system at all).
export const SDK_DTS = `// Ambient types for the runtime injected into orders-api/handler.ts and
// worker/consume.ts. This is the ONLY interface to the outside world —
// there is no ambient network, clock, or filesystem access.
//
// These are also live in the editor: hover or autocomplete "ctx." in
// handler.ts or consume.ts to see this exact shape.

interface OrderRow {
  id: string
  status: 'pending' | 'settled'
  total: number
}

interface DbApi {
  query(id: string): Promise<OrderRow | undefined>
  exec(
    id: string,
    patch: Partial<OrderRow>,
    opts?: { ifStatus?: OrderRow['status'] }
  ): Promise<{ updated: boolean }>
}

interface HttpApi {
  post(
    endpoint: string,
    body: Record<string, unknown>,
    opts?: { idempotencyKey?: string }
  ): Promise<{ ok: boolean; charged: boolean; status: number }>
}

// orders-api/handler.ts's ctx
interface ApiCtx {
  db: DbApi & { create(id: string, total: number): Promise<void> }
  http: HttpApi
  queue: { publish(orderId: string): void }
  now(): number
}

// worker/consume.ts's ctx
interface Ctx {
  db: DbApi
  http: HttpApi
  queue: { ack(): void }
  now(): number
}
`

const CONSTANTS_TS = `export const QUEUE_NAME = 'payments'
export const CHARGE_ENDPOINT = 'payments.charge'
export const CURRENCY = 'usd'
`

const PACKAGE_JSON = `{
  "name": "checkout-platform",
  "private": true,
  "workspaces": ["services/*"],
  "scripts": {
    "dev": "turbo run dev",
    "test": "turbo run test"
  }
}
`

const TSCONFIG_JSON = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "skipLibCheck": true
  }
}
`

const ENV_EXAMPLE = `PAYMENTS_GATEWAY_URL=https://api.payments.example.com
PAYMENTS_GATEWAY_TIMEOUT_MS=5000
DATABASE_URL=postgres://checkout:••••••@postgres-primary:5432/checkout
QUEUE_URL=payments
`

// used when a scenario leaves a slot sealed — shows the correct reference
// implementation rather than an empty file
const CORRECT_API_HANDLER = `async function handle(req, ctx) {
  await ctx.db.create(req.orderId, req.total)
  ctx.queue.publish(req.orderId)
}`

const CORRECT_WORKER_CONSUME = `async function handle(msg, ctx) {
  const order = await ctx.db.query(msg.orderId)
  if (!order || order.status === 'settled') {
    ctx.queue.ack()
    return
  }

  const result = await ctx.http.post('payments.charge', {
    orderId: msg.orderId,
    amt: order.total,
  }, { idempotencyKey: msg.orderId })

  if (result.charged) {
    await ctx.db.exec(msg.orderId, { status: 'settled' }, { ifStatus: 'pending' })
  }

  ctx.queue.ack()
}`

export interface FsFile {
  path: string
  editable: boolean
  language: VFile['language']
  content: string
}

export function buildFilesystem(scenario: Scenario): FsFile[] {
  const starters = Object.fromEntries(scenario.editableFiles.map((f) => [f.path, f.starter]))
  const isEditable = (key: string) => key in starters
  return [
    {
      path: 'services/orders-api/handler.ts',
      editable: isEditable('orders-api/handler.ts'),
      language: 'typescript',
      content: starters['orders-api/handler.ts'] ?? CORRECT_API_HANDLER,
    },
    { path: 'services/orders-api/routes.ts', editable: false, language: 'typescript', content: ROUTES_TS },
    { path: 'services/orders-api/middleware/auth.ts', editable: false, language: 'typescript', content: AUTH_MIDDLEWARE },
    { path: 'services/orders-api/middleware/rateLimit.ts', editable: false, language: 'typescript', content: RATE_LIMIT_MIDDLEWARE },
    { path: 'services/orders-api/types.ts', editable: false, language: 'typescript', content: API_TYPES_TS },
    { path: 'services/orders-api/README.md', editable: false, language: 'markdown', content: API_README },

    {
      path: 'services/worker/consume.ts',
      editable: isEditable('worker/consume.ts'),
      language: 'typescript',
      content: starters['worker/consume.ts'] ?? CORRECT_WORKER_CONSUME,
    },
    { path: 'services/worker/retry.ts', editable: false, language: 'typescript', content: WORKER_RETRY_TS },
    { path: 'services/worker/types.ts', editable: false, language: 'typescript', content: WORKER_TYPES_TS },
    { path: 'services/worker/README.md', editable: false, language: 'markdown', content: WORKER_README },

    { path: 'infra/topology.yaml', editable: false, language: 'yaml', content: buildTopologyYaml(scenario) },
    { path: 'infra/queue.config.json', editable: false, language: 'json', content: QUEUE_CONFIG_JSON },

    { path: 'shared/sdk.d.ts', editable: false, language: 'typescript', content: SDK_DTS },
    { path: 'shared/constants.ts', editable: false, language: 'typescript', content: CONSTANTS_TS },

    { path: 'package.json', editable: false, language: 'json', content: PACKAGE_JSON },
    { path: 'tsconfig.json', editable: false, language: 'json', content: TSCONFIG_JSON },
    { path: '.env.example', editable: false, language: 'yaml', content: ENV_EXAMPLE },
  ]
}

const IOT_SDK_DTS = `// Ambient types for the runtime injected into dataentry-lambda/handler.ts
// and shift-aggregator/handler.ts. This is the ONLY interface to the
// outside world — there is no ambient network, clock, or filesystem access.
//
// These are also live in the editor: hover or autocomplete "ctx." in either
// handler to see this exact shape.

interface SensorPacket {
  tenantId: string
  lineId: string
  pts: number // packet timestamp
  ptc: number // cumulative packet counter — resets to 0 on device restart
  sr1: number // cumulative good-part counter — same reset behavior as ptc
  sr2: number // cumulative reject counter — same reset behavior as ptc
  ss1: 0 | 1 // run signal
  ss2: 0 | 1 // fault signal
}

interface LineCounters {
  sr1: number
  sr2: number
}

// dataentry-lambda/handler.ts's ctx — one invocation per delivered packet
// (once per line it applies to — fan-out to mirrored lines is automatic,
// this handler never has to know about it)
interface OeeIngestCtx {
  db: {
    insertPacket(packet: SensorPacket): Promise<void>
    // last-write-wins unless ifNewerThan is set, in which case the write is
    // dropped when a status with a newer pts is already stored
    writeLineStatus(
      lineId: string,
      up: boolean,
      ts: number,
      opts?: { ifNewerThan?: boolean }
    ): Promise<{ updated: boolean }>
  }
  now(): number
}

// shift-aggregator/handler.ts's ctx — one invocation per cron tick (every 1s)
interface OeeShiftCtx {
  // every line id across every tenant
  lines(): string[]
  // which shift a given line's clock says a timestamp falls into —
  // each tenant has its own daily-recurring schedule
  shiftFor(lineId: string, ts: number): string
  db: {
    packetsSince(lineId: string, cursorPts: number): Promise<SensorPacket[]>
    getCursor(lineId: string): Promise<number>
    getLastCounters(lineId: string): Promise<LineCounters | undefined>
    // folds delta into shiftId's running totals and advances the line's
    // cursor/last-seen counters — sr1/sr2 are cumulative device registers
    // that reset to 0 on a device restart, so a naive
    // "packet.sr1 - lastCounters.sr1" goes negative across a reset
    commitShiftCounts(
      lineId: string,
      shiftId: string,
      delta: { good: number; reject: number },
      opts: { lastCounters: LineCounters; newCursor: number }
    ): Promise<void>
  }
  now(): number
}
`

const DATAENTRY_README = `# dataentry-lambda

Invoked by iot-core once per delivered packet. Writes the raw packet and
updates that line's current run/fault status from ss1/ss2.

A static, fixed fan-out map means some lines (line-2, line-3) have no
sensor of their own — they mirror line-1's packets, re-labeled, because
they share the same physical conveyor sensor. That fan-out is handled by
the harness before this handler ever runs; this code only ever sees "a
packet for a line."

Owned by: oee-platform
On-call: #oee-platform-oncall

## Notes

- Packets can arrive out of order — network delay between a sensor and
  iot-core is not fixed, and invocations can overlap.
- This handler must be safe against a stale packet arriving after a
  fresher one for the same line.
`

const SHIFT_AGGREGATOR_README = `# shift-aggregator

Fired by cron-trigger every second. For each line, reads packets ingested
since the last tick and folds their good/reject deltas into whichever
shift is currently open for that line's tenant — shifts recur daily, and
each tenant (plant) has its own schedule, so "currently open" is
tenant-relative, not one global clock.

Owned by: oee-platform
On-call: #oee-platform-oncall

## Notes

- sr1 (good count) and sr2 (reject count) are cumulative counters read
  directly off the device — they are NOT reset by us, only by the device
  itself rebooting. A restart drops them back near 0 mid-stream.
- This handler must be safe against that reset: computing a delta as
  "current − last seen" goes negative right after a restart. Detecting a
  reset (current < last seen) and counting from 0 instead is required.
`

const DASHBOARD_GETSTATS_TS = `// Sealed — this just reads whatever shift-aggregator last committed and
// returns it, plus the downtime the harness tracked separately from ss1/ss2
// and disconnects. If the numbers are wrong here, the bug is upstream.
async function handle(_req, ctx) {
  const shiftTotals = await ctx.db.readShiftTotals()
  return { status: 200, body: shiftTotals }
}
`

const DASHBOARD_README = `# oee-dashboard

Serves the plant OEE dashboard's \`getStats\` endpoint. Read-only — it has
no way to correct anything shift-aggregator got wrong.

Owned by: dashboard-team
On-call: #dashboard-oncall
`

const CRON_SCHEDULE_JSON = `{
  "job": "shift-aggregator",
  "schedule": "rate(1 second)",
  "concurrency": "unlimited",
  "timeout_ms": 5000
}
`

const IOT_PACKAGE_JSON = `{
  "name": "oee-platform",
  "private": true,
  "workspaces": ["services/*"],
  "scripts": {
    "dev": "turbo run dev",
    "test": "turbo run test"
  }
}
`

const IOT_ENV_EXAMPLE = `IOT_CORE_ENDPOINT=https://iot.example.com
OEE_DB_TABLE_PACKETS=oee-packets
OEE_DB_TABLE_LINE_STATUS=oee-line-status
OEE_DB_TABLE_SHIFT_TOTALS=oee-shift-totals
`

export function buildIotFilesystem(scenario: Scenario): FsFile[] {
  const starters = Object.fromEntries(scenario.editableFiles.map((f) => [f.path, f.starter]))
  return [
    {
      path: 'services/dataentry-lambda/handler.ts',
      editable: true,
      language: 'typescript',
      content: starters['dataentry-lambda/handler.ts'] ?? '',
    },
    { path: 'services/dataentry-lambda/README.md', editable: false, language: 'markdown', content: DATAENTRY_README },

    {
      path: 'services/shift-aggregator/handler.ts',
      editable: true,
      language: 'typescript',
      content: starters['shift-aggregator/handler.ts'] ?? '',
    },
    { path: 'services/shift-aggregator/README.md', editable: false, language: 'markdown', content: SHIFT_AGGREGATOR_README },

    { path: 'services/oee-dashboard/getStats.ts', editable: false, language: 'typescript', content: DASHBOARD_GETSTATS_TS },
    { path: 'services/oee-dashboard/README.md', editable: false, language: 'markdown', content: DASHBOARD_README },

    { path: 'infra/topology.yaml', editable: false, language: 'yaml', content: buildTopologyYaml(scenario) },
    { path: 'infra/cron.schedule.json', editable: false, language: 'json', content: CRON_SCHEDULE_JSON },

    { path: 'shared/sdk.d.ts', editable: false, language: 'typescript', content: IOT_SDK_DTS },

    { path: 'package.json', editable: false, language: 'json', content: IOT_PACKAGE_JSON },
    { path: 'tsconfig.json', editable: false, language: 'json', content: TSCONFIG_JSON },
    { path: '.env.example', editable: false, language: 'yaml', content: IOT_ENV_EXAMPLE },
  ]
}
