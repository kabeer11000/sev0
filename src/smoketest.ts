import { runScenario, submitScenario } from './runner'
import { checkoutScenario } from './scenario/checkout'
import { retryStormScenario } from './scenario/retryStorm'
import { setWorkerPoolDebug } from './sim/workers'
import type { OracleMetric } from './oracle/invariants'

setWorkerPoolDebug(false)

function metric(metrics: OracleMetric[], key: string): string {
  return metrics.find((m) => m.key === key)?.value ?? '?'
}

const buggyApi = checkoutScenario.editableFiles[0].starter
const buggyWorker = checkoutScenario.editableFiles[1].starter

const fixedApi = `/**
 * @param {{ orderId: string, total: number }} req
 * @param {ApiCtx} ctx
 */
async function handle(req, ctx) {
  await ctx.http.post('risk.check', { orderId: req.orderId })
  await ctx.db.create(req.orderId, req.total)
  ctx.queue.publish(req.orderId)
}`

const fixedWorker = `/**
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

  if (result.charged) {
    await ctx.db.exec(msg.orderId, { status: 'settled' }, { ifStatus: 'pending' })
  }

  ctx.queue.ack()
}`

function summarize(label: string, results: { key: string; passed: boolean }[]) {
  const byKey = Object.fromEntries(results.map((r) => [r.key, r.passed]))
  console.log(label.padEnd(28), JSON.stringify(byKey))
}

async function main() {
  console.log('--- 2x2 matrix on practice seed ---')
  const combos: [string, string, string][] = [
    ['buggy api + buggy worker', buggyApi, buggyWorker],
    ['fixed api + buggy worker', fixedApi, buggyWorker],
    ['buggy api + fixed worker', buggyApi, fixedWorker],
    ['fixed api + fixed worker', fixedApi, fixedWorker],
  ]
  for (const [label, api, worker] of combos) {
    const r = await runScenario(checkoutScenario, { api, worker }, checkoutScenario.practiceSeed)
    if (r.error) {
      console.log(label.padEnd(28), 'COMPILE ERROR:', r.error)
    } else {
      summarize(label, r.oracle.results)
    }
  }

  console.log('\n--- fully fixed, submit across all hidden seeds ---')
  const submit = await submitScenario(checkoutScenario, { api: fixedApi, worker: fixedWorker })
  console.log('passRate:', submit.passRate, 'passed:', submit.passed)
  submit.runs.forEach((r) => summarize(`  seed ${r.seed}`, r.oracle.results))

  console.log('\n--- fully buggy, submit across all hidden seeds ---')
  const buggySubmit = await submitScenario(checkoutScenario, { api: buggyApi, worker: buggyWorker })
  console.log('passRate:', buggySubmit.passRate, 'passed:', buggySubmit.passed)
  buggySubmit.runs.forEach((r) => summarize(`  seed ${r.seed}`, r.oracle.results))

  console.log('\n--- determinism check: same seed twice ---')
  const a = await runScenario(checkoutScenario, { api: buggyApi, worker: buggyWorker }, 777)
  const b = await runScenario(checkoutScenario, { api: buggyApi, worker: buggyWorker }, 777)
  const same = JSON.stringify(a.log.all()) === JSON.stringify(b.log.all())
  console.log('identical event logs:', same, 'lengths:', a.log.all().length, b.log.all().length)

  // --- retry-storm scenario ---
  const stormBuggyWorker = retryStormScenario.editableFiles[0].starter
  const stormFixedWorker = `/**
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
}`
  // orders-api is sealed for this scenario — this is its actual (correct) content
  const stormApi = `async function handle(req, ctx) {
  await ctx.db.create(req.orderId, req.total)
  ctx.queue.publish(req.orderId)
}`

  console.log('\n--- retry storm: buggy vs fixed, practice seed ---')
  for (const [label, worker] of [
    ['buggy (tight retry loop)', stormBuggyWorker],
    ['fixed (no manual retry)', stormFixedWorker],
  ] as const) {
    const r = await runScenario(retryStormScenario, { api: stormApi, worker }, retryStormScenario.practiceSeed)
    if (r.error) {
      console.log(label.padEnd(28), 'COMPILE ERROR:', r.error)
    } else {
      summarize(label, r.oracle.results)
      console.log(
        '   externalCalls:', metric(r.oracle.metrics, 'externalCalls'),
        'ordersSettled:', metric(r.oracle.metrics, 'ordersSettled'),
      )
    }
  }

  console.log('\n--- retry storm: fixed, submit across all hidden seeds ---')
  const stormSubmit = await submitScenario(retryStormScenario, { api: stormApi, worker: stormFixedWorker })
  console.log('passRate:', stormSubmit.passRate, 'passed:', stormSubmit.passed)
  stormSubmit.runs.forEach((r) => summarize(`  seed ${r.seed}`, r.oracle.results))
  stormSubmit.runs.forEach((r) => console.log(`    seed ${r.seed} externalCalls:`, metric(r.oracle.metrics, 'externalCalls')))

  console.log('\n--- retry storm: buggy, submit across all hidden seeds ---')
  const stormBuggySubmit = await submitScenario(retryStormScenario, { api: stormApi, worker: stormBuggyWorker })
  console.log('passRate:', stormBuggySubmit.passRate, 'passed:', stormBuggySubmit.passed)
  stormBuggySubmit.runs.forEach((r) => summarize(`  seed ${r.seed}`, r.oracle.results))
  stormBuggySubmit.runs.forEach((r) => console.log(`    seed ${r.seed} externalCalls:`, metric(r.oracle.metrics, 'externalCalls')))
}

main().catch((e) => {
  console.error('SMOKETEST FAILED', e)
  throw e
})
