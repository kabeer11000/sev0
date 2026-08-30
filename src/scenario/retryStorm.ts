import type { Scenario } from './types'

export const retryStormScenario: Scenario = {
  id: 'retry-storm-during-outage',
  caseId: 'INC-5108',
  title: 'An unbounded retry loop turned a 40-minute provider blip into a full checkout outage',
  displayTitle: 'Checkout went fully down during a brief payment-gateway issue',
  severity: 'SEV0',
  difficulty: 'easy',
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
  hints: [
    'The provider outage lasted 40 minutes. Checkout stayed degraded much longer than that — something is amplifying a short outage, not just riding it out.',
    "worker/consume.ts retries the charge call up to 20 times in a tight loop before ever calling `ctx.queue.ack()`. During the outage, how long does one message now hold a worker, and what happens to every other message stacked up behind it?",
    "The queue's `visibilityTimeoutMs` doesn't care that a worker is busy retrying — a message that isn't acked within it gets redelivered to a *different* worker, which starts its own 20-attempt retry loop on the same order. That's what's driving the external-call-budget over.",
  ],
  solution: {
    explanation:
      "worker/consume.ts hand-rolls a 20-attempt retry loop around the charge call. During the provider's failure window this means one worker can spend most of its visibility timeout retrying a single message — and once that timeout lapses, the queue redelivers the same message to another worker, which starts its own 20-attempt loop, multiplying calls to an already-struggling provider and starving every other queued order behind it. The fix removes the manual retry entirely: attempt the charge once, and if the provider call didn't even complete (`!result.ok`), just return without acking — the queue's own visibility-timeout redelivery is the retry mechanism, and it naturally backs off because a busy worker can only hold one message at a time instead of looping on it.",
    files: [
      {
        path: 'worker/consume.ts',
        code: `/**
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
  }, { idempotencyKey: msg.orderId })

  if (!result.ok) {
    return
  }

  if (result.charged) {
    await ctx.db.exec(msg.orderId, { status: 'settled' }, { ifStatus: 'pending' })
  }

  ctx.queue.ack()
}`,
      },
    ],
  },
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
