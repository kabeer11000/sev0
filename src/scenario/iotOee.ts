import type { Scenario } from './types'

const MIN = 60_000

export const iotOeeScenario: Scenario = {
  id: 'oee-shift-counter-race',
  caseId: 'INC-7734',
  title: 'A device-restart counter reset and an unordered status write are corrupting OEE counts and line status across shifts',
  displayTitle: "Line status flickers wrong and shift OEE counts don't reconcile with raw telemetry",
  severity: 'SEV1',
  timeLimitMs: 50 * MIN,
  domain: 'iot',
  incidentReport: [
    'Plant ops on line-4 (plant-south) reported the dashboard showed the line running for several minutes after it was physically e-stopped.',
    "Separately, plant-north's shift OEE report came back with impossible numbers for shiftB on day 0 — good-part count dropped sharply mid-shift before recovering, which cannot happen (counts only go up during a shift).",
    'The line-1 sensor logged a routine reboot around that time (visible in its own diagnostics) — nothing else on the line changed.',
    'iot-core shows no dropped or throttled deliveries for either plant during either window.',
    'The shift-aggregator cron has been firing every second without any reported errors or timeouts, for either tenant.',
    'Nothing was deployed to iot-core, sensors, or the dashboard recently — the last deploy touched dataentry-lambda and shift-aggregator.',
  ],
  topology: {
    nodes: [
      { id: 'line-1', label: 'line-1 (plant-north)', kind: 'device', sealed: true, note: 'sensor — shared with line-2, line-3' },
      { id: 'line-2', label: 'line-2 (plant-north)', kind: 'device', sealed: true, note: 'mirrors line-1' },
      { id: 'line-3', label: 'line-3 (plant-north)', kind: 'device', sealed: true, note: 'mirrors line-1' },
      { id: 'line-4', label: 'line-4 (plant-south)', kind: 'device', sealed: true, note: 'sensor' },
      { id: 'iot-core', label: 'iot-core', kind: 'gateway', sealed: true, note: 'managed ingestion endpoint' },
      { id: 'dataentry-lambda', label: 'dataentry-lambda', kind: 'lambda', sealed: false, file: 'services/dataentry-lambda/handler.ts' },
      { id: 'cron-trigger', label: 'cron-trigger', kind: 'cron', sealed: true, note: 'fires every 1s' },
      { id: 'shift-aggregator', label: 'shift-aggregator', kind: 'lambda', sealed: false, file: 'services/shift-aggregator/handler.ts' },
      { id: 'oee-db', label: 'oee-db', kind: 'db', sealed: true, note: 'packets + line status + shift totals' },
      { id: 'oee-dashboard', label: 'oee-dashboard', kind: 'frontend', sealed: true, file: 'services/oee-dashboard/getStats.ts' },
    ],
    edges: [
      ['line-1', 'iot-core'],
      ['line-2', 'iot-core'],
      ['line-3', 'iot-core'],
      ['line-4', 'iot-core'],
      ['iot-core', 'dataentry-lambda'],
      ['dataentry-lambda', 'oee-db'],
      ['cron-trigger', 'shift-aggregator'],
      ['shift-aggregator', 'oee-db'],
      ['oee-dashboard', 'oee-db'],
    ],
  },
  editableFiles: [
    {
      path: 'dataentry-lambda/handler.ts',
      starter: `/**
 * @param {{ tenantId: string, lineId: string, pts: number, ptc: number, sr1: number, sr2: number, ss1: 0|1, ss2: 0|1 }} packet
 * @param {OeeIngestCtx} ctx
 */
async function handle(packet, ctx) {
  await ctx.db.insertPacket(packet)
  const up = packet.ss1 === 1 && packet.ss2 === 0
  await ctx.db.writeLineStatus(packet.lineId, up, packet.pts)
}`,
    },
    {
      path: 'shift-aggregator/handler.ts',
      starter: `/**
 * @param {{}} _msg
 * @param {OeeShiftCtx} ctx
 */
async function handle(_msg, ctx) {
  for (const lineId of ctx.lines()) {
    const cursor = await ctx.db.getCursor(lineId)
    const packets = await ctx.db.packetsSince(lineId, cursor)
    if (packets.length === 0) continue

    let last = await ctx.db.getLastCounters(lineId)
    const deltasByShift = {}

    for (const p of packets) {
      const shiftId = ctx.shiftFor(lineId, p.pts)
      if (!deltasByShift[shiftId]) deltasByShift[shiftId] = { good: 0, reject: 0 }

      if (last) {
        deltasByShift[shiftId].good += p.sr1 - last.sr1
        deltasByShift[shiftId].reject += p.sr2 - last.sr2
      }
      last = { sr1: p.sr1, sr2: p.sr2 }
    }

    for (const shiftId of Object.keys(deltasByShift)) {
      await ctx.db.commitShiftCounts(lineId, shiftId, deltasByShift[shiftId], {
        lastCounters: last,
        newCursor: packets[packets.length - 1].pts,
      })
    }
  }
}`,
    },
  ],
  params: {
    durationMs: 24 * MIN,
    drainMs: 6 * MIN,
    ratePerMs: 0,
    workerCount: 0,
    visibilityTimeoutMs: 0,
    dbReadLatencyMs: 4,
    dbWriteLatencyMs: 6,
    httpBaseLatencyMs: 0,
    riskCheckLatencyMs: 0,
    spike: { startMs: 0, endMs: 0, latencyMs: 0 },
    kill: { workerIndex: 0, atMs: 0, restartAtMs: 0 },
    failureWindow: { startMs: 0, endMs: 0, rate: 0 },
    invariants: { settleWindowMs: 0, latencyBudgetMs: 0, externalCallBudget: 0, gateExternalCallBudget: false },
    iot: {
      tenants: [
        { id: 'plant-north', dayLengthMs: 18 * MIN, dayOffsetMs: 0, shiftLabels: ['shiftA', 'shiftB', 'shiftC'] },
        { id: 'plant-south', dayLengthMs: 18 * MIN, dayOffsetMs: 2 * MIN, shiftLabels: ['shiftA', 'shiftB', 'shiftC'] },
      ],
      lines: [
        { id: 'line-1', tenantId: 'plant-north', idealCycleMs: 2000 },
        { id: 'line-2', tenantId: 'plant-north', mirrorOf: 'line-1', idealCycleMs: 2000 },
        { id: 'line-3', tenantId: 'plant-north', mirrorOf: 'line-1', idealCycleMs: 2000 },
        { id: 'line-4', tenantId: 'plant-south', idealCycleMs: 3000 },
      ],
      heartbeatIntervalMs: 10_000,
      ingestJitterMs: 500,
      disconnectTimeoutMs: 35_000,
      rejectRate: 0.06,
      deviceRestart: { lineId: 'line-1', atMs: 9 * MIN },
      statusFlap: { lineId: 'line-4', downAtMs: 15 * MIN, backUpAtMs: 17 * MIN, delayedPacketLatencyMs: 20_000 },
      disconnectWindow: { lineId: 'line-1', startMs: 19 * MIN, endMs: 20 * MIN },
    },
  },
  practiceSeed: 5150,
  hiddenSeeds: [2201, 47733, 6089, 91214, 358],
}
