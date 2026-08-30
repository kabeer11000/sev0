import type { Scenario } from './types'

export const checkoutScenario: Scenario = {
  id: 'double-charge-under-retry',
  caseId: 'INC-4471',
  title: 'Double-charge under retry, plus a shared-state amount bug in orders-api',
  displayTitle: 'Customers billed the wrong amount — some more than once',
  severity: 'SEV0',
  timeLimitMs: 60 * 60 * 1000,
  domain: 'checkout',
  incidentReport: [
    '37 duplicate charges reported between 02:14 and 02:31 UTC.',
    'Support queue is on fire — customers report two, in one case three, charges for a single order.',
    "A separate, smaller cluster of tickets: customers charged an amount that doesn't match anything in their cart — support suspects it's someone else's order total.",
    'Payments provider dashboard reports nothing wrong on their end.',
    'Checkout itself was not down. Orders were accepted the whole time.',
  ],
  topology: {
    nodes: [
      { id: 'gateway', label: 'gateway', kind: 'gateway', sealed: true, note: 'load balancer' },
      { id: 'orders-api', label: 'orders-api', kind: 'api', sealed: false, file: 'services/orders-api/handler.ts' },
      { id: 'risk-engine', label: 'risk-engine', kind: 'external', sealed: true, note: 'third-party' },
      { id: 'payments-queue', label: 'payments-queue', kind: 'queue', sealed: true },
      { id: 'worker-0', label: 'worker-0', kind: 'worker', sealed: false, file: 'services/worker/consume.ts' },
      { id: 'worker-1', label: 'worker-1', kind: 'worker', sealed: false, file: 'services/worker/consume.ts' },
      { id: 'worker-2', label: 'worker-2', kind: 'worker', sealed: false, file: 'services/worker/consume.ts' },
      { id: 'worker-3', label: 'worker-3', kind: 'worker', sealed: false, file: 'services/worker/consume.ts' },
      { id: 'postgres', label: 'postgres', kind: 'db', sealed: true, note: 'orders db' },
      { id: 'payment-gateway', label: 'payment-gateway', kind: 'external', sealed: true, note: 'third-party' },
    ],
    edges: [
      ['gateway', 'orders-api'],
      ['orders-api', 'risk-engine'],
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
      starter: `let pendingTotal = 0

/**
 * @param {{ orderId: string, total: number }} req
 * @param {ApiCtx} ctx
 */
async function handle(req, ctx) {
  pendingTotal = req.total

  await ctx.http.post('risk.check', { orderId: req.orderId })

  await ctx.db.create(req.orderId, pendingTotal)
  ctx.queue.publish(req.orderId)
}`,
    },
    {
      path: 'worker/consume.ts',
      starter: `/**
 * @param {{ orderId: string }} msg
 * @param {Ctx} ctx
 */
async function handle(msg, ctx) {
  const order = await ctx.db.query(msg.orderId)
  if (!order || order.status === 'settled') {
    ctx.queue.ack()
    return
  }

  const result = await ctx.http.post('payments.charge', {
    orderId: msg.orderId,
    amt: order.total,
  })

  if (result.charged) {
    await ctx.db.exec(msg.orderId, { status: 'settled' })
  }

  ctx.queue.ack()
}`,
    },
  ],
  params: {
    durationMs: 120_000,
    drainMs: 90_000,
    ratePerMs: 2.5 / 1000,
    workerCount: 4,
    visibilityTimeoutMs: 6_000,
    dbReadLatencyMs: 4,
    dbWriteLatencyMs: 6,
    httpBaseLatencyMs: 120,
    riskCheckLatencyMs: 140,
    spike: { startMs: 24_000, endMs: 64_000, latencyMs: 9_000 },
    kill: { workerIndex: 2, atMs: 30_000, restartAtMs: 42_000 },
    failureWindow: { startMs: 0, endMs: 0, rate: 0 },
    invariants: { settleWindowMs: 90_000, latencyBudgetMs: 1_200, externalCallBudget: 500 },
  },
  practiceSeed: 1337,
  hiddenSeeds: [4021, 88817, 152, 9931, 60214],
}
