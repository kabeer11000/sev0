import type { Scenario } from './types'

export const retryStormScenario: Scenario = {
  id: 'retry-storm-during-outage',
  caseId: 'INC-5108',
  title: 'An unbounded retry loop turned a 40-minute provider blip into a full checkout outage',
  displayTitle: 'Checkout went fully down during a brief payment-gateway issue',
  severity: 'SEV0',
  timeLimitMs: 40 * 60 * 1000,
  domain: 'checkout',
  incidentReport: [
    'Payment success rate dropped for about 40 minutes starting 03:10 UTC. The provider confirms a brief incident on their end.',
    "But checkout got dramatically worse than the provider's own outage should explain — queue depth spiked hard and stayed high.",
    "A handful of orders from that window never settled at all. No error surfaced anywhere — they're just silently stuck as pending.",
    'The provider says their incident lasted 40 minutes. Ours lasted noticeably longer.',
  ],
  topology: {
    nodes: [
      { id: 'gateway', label: 'gateway', kind: 'gateway', sealed: true, note: 'load balancer' },
      { id: 'orders-api', label: 'orders-api', kind: 'api', sealed: true, file: 'services/orders-api/handler.ts' },
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

  let result
  for (let attempt = 0; attempt < 20; attempt++) {
    result = await ctx.http.post('payments.charge', {
      orderId: msg.orderId,
      amt: order.total,
    }, { idempotencyKey: msg.orderId })
    if (result.ok) break
  }

  if (result.charged) {
    await ctx.db.exec(msg.orderId, { status: 'settled' }, { ifStatus: 'pending' })
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
    spike: { startMs: 0, endMs: 0, latencyMs: 0 },
    kill: { workerIndex: 0, atMs: 0, restartAtMs: 0 },
    failureWindow: { startMs: 30_000, endMs: 70_000, rate: 0.9 },
    invariants: { settleWindowMs: 90_000, latencyBudgetMs: 1_200, externalCallBudget: 700, gateExternalCallBudget: true },
  },
  practiceSeed: 2024,
  hiddenSeeds: [7331, 41209, 918, 63027, 5540],
}
