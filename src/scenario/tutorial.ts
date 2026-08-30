import type { Scenario } from './types'

export const tutorialScenario: Scenario = {
  id: 'tutorial-missing-write',
  caseId: 'INC-0001',
  title: 'orders-api accepted every order but never wrote it to the database',
  displayTitle: 'Checkout accepts orders, but nothing about them ever exists again',
  severity: 'SEV2',
  difficulty: 'tutorial',
  timeLimitMs: 60 * 60 * 1000,
  domain: 'checkout',
  incidentReport: [
    "Welcome — this one's a tutorial. Nothing here is timed against you, and the bug is deliberately obvious.",
    'Customers say checkout accepts their order — no error, no rejection — but nothing ever happens after that. No charge, no confirmation, nothing.',
    "Start on the left: the Files panel lists every file in this (simulated) service. orders-api/handler.ts is the only editable one — click it to open it in the center panel.",
    "Read it top to bottom — it's short. Then open services/worker/consume.ts from the Files panel too (it's sealed, read-only, but you can still look): the first thing it does is `ctx.db.query(msg.orderId)` and expects a row to already exist.",
    "Once you think you've spotted what orders-api/handler.ts forgot to do, fix it, then click 'Run practice seed' in the header (or press ⌘⏎) — watch the Verdict panel on the right and the timeline/event feed below update as the replay plays out.",
    "When every check in the Verdict panel passes on the practice seed, click 'Submit' to grade your fix against a few seeds you haven't seen — that's what actually closes an incident here, not just a clean practice run.",
    "Stuck, or just curious how the rest of the UI works? The Hints tab has nudges and, if you want it, the full solution — and the '?' button in the header replays the how-this-works tour.",
  ],
  topology: {
    nodes: [
      { id: 'gateway', label: 'gateway', kind: 'gateway', sealed: true, note: 'load balancer' },
      { id: 'orders-api', label: 'orders-api', kind: 'api', sealed: false, file: 'services/orders-api/handler.ts' },
      { id: 'payments-queue', label: 'payments-queue', kind: 'queue', sealed: true },
      { id: 'worker-0', label: 'worker-0', kind: 'worker', sealed: true, file: 'services/worker/consume.ts' },
      { id: 'worker-1', label: 'worker-1', kind: 'worker', sealed: true, file: 'services/worker/consume.ts' },
      { id: 'worker-2', label: 'worker-2', kind: 'worker', sealed: true, file: 'services/worker/consume.ts' },
      { id: 'worker-3', label: 'worker-3', kind: 'worker', sealed: true, file: 'services/worker/consume.ts' },
      { id: 'postgres', label: 'postgres', kind: 'db', sealed: true, note: 'orders db' },
      { id: 'payment-gateway', label: 'payment-gateway', kind: 'external', sealed: true, note: 'third-party' },
    ],
    edges: [
      ['gateway', 'orders-api'],
      ['orders-api', 'postgres'],
      ['orders-api', 'payments-queue'],
      ['payments-queue', 'worker-0'],
      ['payments-queue', 'worker-1'],
      ['payments-queue', 'worker-2'],
      ['payments-queue', 'worker-3'],
      ['worker-0', 'postgres'],
      ['worker-1', 'postgres'],
      ['worker-2', 'postgres'],
      ['worker-3', 'postgres'],
      ['worker-0', 'payment-gateway'],
      ['worker-1', 'payment-gateway'],
      ['worker-2', 'payment-gateway'],
      ['worker-3', 'payment-gateway'],
    ],
  },
  editableFiles: [
    {
      path: 'orders-api/handler.ts',
      starter: `/**
 * @param {{ orderId: string, total: number }} req
 * @param {ApiCtx} ctx
 */
async function handle(req, ctx) {
  ctx.queue.publish(req.orderId)
}`,
    },
  ],
  hints: [
    "Walk through orders-api/handler.ts one line at a time — what does it actually do with `req` before publishing to the queue?",
    "services/worker/consume.ts calls `ctx.db.query(msg.orderId)` and bails out if nothing comes back. Which `ctx` call is responsible for that row existing in the first place? Check the Docs tab for its exact signature.",
  ],
  solution: {
    explanation:
      "orders-api/handler.ts published straight to the queue without ever writing the order row — `ctx.db.create(req.orderId, req.total)` was missing entirely. The worker then queried for an order that was never there, found nothing, and silently acked and dropped every message. The fix is one line: create the row before publishing.",
    files: [
      {
        path: 'orders-api/handler.ts',
        code: `/**
 * @param {{ orderId: string, total: number }} req
 * @param {ApiCtx} ctx
 */
async function handle(req, ctx) {
  await ctx.db.create(req.orderId, req.total)
  ctx.queue.publish(req.orderId)
}`,
      },
    ],
  },
  params: {
    durationMs: 60_000,
    drainMs: 45_000,
    ratePerMs: 1.5 / 1000,
    workerCount: 4,
    visibilityTimeoutMs: 6_000,
    dbReadLatencyMs: 4,
    dbWriteLatencyMs: 6,
    httpBaseLatencyMs: 120,
    riskCheckLatencyMs: 140,
    spike: { startMs: 0, endMs: 0, latencyMs: 0 },
    kill: { workerIndex: 0, atMs: 0, restartAtMs: 0 },
    failureWindow: { startMs: 0, endMs: 0, rate: 0 },
    invariants: { settleWindowMs: 45_000, latencyBudgetMs: 1_200, externalCallBudget: 200 },
  },
  practiceSeed: 1,
  hiddenSeeds: [2, 3, 4],
}
