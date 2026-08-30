import { EventLog } from '../kernel/types'

export interface InvariantResult {
  key: string
  title: string
  passed: boolean
  detail: string
}

export interface OracleMetric {
  key: string
  label: string
  value: string
  warn?: boolean
}

export interface OracleReport {
  results: InvariantResult[]
  metrics: OracleMetric[]
  passed: boolean
}

// Runs entirely over the event log — the same function grades the client
// preview run and every hidden-seed submission run. Settlement latency and
// external-call volume are reported but not gated: the slow payment gateway
// is a sealed dependency the player cannot patch, so penalizing its tail
// would grade the incident, not the fix.
export function evaluateInvariants(
  log: EventLog,
  opts: { settleWindowMs: number; latencyBudgetMs: number; externalCallBudget: number; gateExternalCallBudget?: boolean },
): OracleReport {
  const accepted = new Map<string, number>()
  const settled = new Map<string, number>()
  const chargeCounts = new Map<string, number>()
  const requestedTotal = new Map<string, number>()
  const createdTotal = new Map<string, number>()
  let externalCalls = 0

  for (const e of log.all()) {
    switch (e.kind) {
      case 'request.accepted':
        accepted.set(e.orderId!, e.t)
        if (typeof e.detail?.total === 'number') requestedTotal.set(e.orderId!, e.detail.total)
        break
      case 'db.create':
        if (typeof e.detail?.total === 'number') createdTotal.set(e.orderId!, e.detail.total)
        break
      case 'order.settled':
        if (!settled.has(e.orderId!)) settled.set(e.orderId!, e.t)
        break
      case 'charge.success':
        chargeCounts.set(e.orderId!, (chargeCounts.get(e.orderId!) ?? 0) + 1)
        break
      case 'charge.attempt':
        externalCalls++
        break
    }
  }

  const latencies: number[] = []
  const stuck: string[] = []
  const late: string[] = []
  for (const [id, t0] of accepted) {
    const t1 = settled.get(id)
    if (t1 == null) {
      stuck.push(id)
      continue
    }
    const dt = t1 - t0
    latencies.push(dt)
    if (dt > opts.settleWindowMs) late.push(id)
  }
  latencies.sort((a, b) => a - b)
  const p99 = latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.99))] : 0

  const doubleCharged = [...chargeCounts.entries()].filter(([, c]) => c > 1)

  const amountMismatches: string[] = []
  for (const [id, requested] of requestedTotal) {
    const created = createdTotal.get(id)
    if (created != null && created !== requested) amountMismatches.push(id)
  }

  const results: InvariantResult[] = [
    {
      key: 'no-double-charge',
      title: 'No order charged more than once',
      passed: doubleCharged.length === 0,
      detail:
        doubleCharged.length === 0
          ? `${chargeCounts.size} orders charged, each exactly once`
          : `${doubleCharged.length} orders charged multiple times — e.g. ${doubleCharged[0][0]} charged ${doubleCharged[0][1]}×`,
    },
    {
      key: 'settles-within-window',
      title: `Every accepted order settles within ${Math.round(opts.settleWindowMs / 1000)}s`,
      passed: stuck.length === 0 && late.length === 0,
      detail:
        stuck.length || late.length
          ? `${stuck.length} orders never settled, ${late.length} settled late — e.g. ${stuck[0] ?? late[0]}`
          : `${settled.size} of ${accepted.size} accepted orders settled on time`,
    },
    {
      key: 'amount-integrity',
      title: 'Every order is charged its own requested amount',
      passed: amountMismatches.length === 0,
      detail:
        amountMismatches.length === 0
          ? `${createdTotal.size} orders checked, amounts all match`
          : `${amountMismatches.length} orders stored with the wrong amount — e.g. ${amountMismatches[0]}`,
    },
    ...(opts.gateExternalCallBudget
      ? [
          {
            key: 'external-call-budget',
            title: `Payment-gateway calls stay within budget (${opts.externalCallBudget})`,
            passed: externalCalls <= opts.externalCallBudget,
            detail: `${externalCalls} calls made${externalCalls > opts.externalCallBudget ? ` — ${externalCalls - opts.externalCallBudget} over budget` : ''}`,
          },
        ]
      : []),
  ]

  const metrics: OracleMetric[] = [
    { key: 'ordersSettled', label: 'orders settled', value: `${settled.size} / ${accepted.size}` },
    {
      key: 'p99LatencyMs',
      label: 'p99 settlement latency',
      value: `${Math.round(p99)}ms`,
      warn: p99 > opts.latencyBudgetMs,
    },
    {
      key: 'externalCalls',
      label: 'external calls',
      value: `${externalCalls} / ${opts.externalCallBudget} budget`,
      warn: externalCalls > opts.externalCallBudget,
    },
  ]

  return { results, metrics, passed: results.every((r) => r.passed) }
}
