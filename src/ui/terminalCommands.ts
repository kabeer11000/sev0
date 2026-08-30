import type { Scenario } from '../scenario/types'
import type { RunResult } from '../runner'
import type { IotRunResult } from '../iotRunner'
import { nodeStatusAt, queueDepthAt } from './topologyState'

type AnyRunResult = RunResult | IotRunResult

function fmtT(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

// pulls a trailing "ord-123"-shaped token off a command, e.g.
// "logs ord-42" -> "ord-42", "select * from orders where id='ord-42'" -> "ord-42"
function extractOrderId(cmd: string): string | undefined {
  const m = cmd.match(/(ord-\d+)/i)
  return m?.[1]
}

function tail(lastRun: AnyRunResult | undefined, scrubberT: number, kinds: string[], n: number, orderId?: string): string[] {
  if (!lastRun) return ['(no run yet — nothing to show)']
  const rows = lastRun.log
    .all()
    .filter((e) => e.t <= scrubberT && kinds.includes(e.kind) && (!orderId || e.orderId === orderId))
    .slice(-n)
  if (rows.length === 0) {
    return [orderId ? `(nothing logged yet for ${orderId} at this point in time)` : '(nothing logged yet at this point in time)']
  }
  return rows.map((e) => {
    const bits = [`[${fmtT(e.t)}]`, e.kind]
    if (e.orderId) bits.push(e.orderId)
    if (e.detail) bits.push(JSON.stringify(e.detail))
    return bits.join('  ')
  })
}

const HELP: Record<string, string[]> = {
  worker: ['ps', 'logs [orderId]', 'status', 'uptime', 'clear'],
  queue: ['depth', 'peek [orderId]', 'clear'],
  db: ["select * from orders [where id='ord-N']", '\\dt', 'clear'],
  external: ['status', 'logs [orderId]', 'clear'],
  api: ['curl -s localhost/health', 'ps', 'logs [orderId]', 'clear'],
  gateway: ['curl -s localhost/health', 'clear'],
  device: ['status', 'logs', 'clear'],
  lambda: ['logs', 'ps', 'clear'],
  cron: ['status', 'logs', 'clear'],
  frontend: ['curl -s localhost/getStats', 'logs', 'clear'],
}

export function helpFor(kind: string): string[] {
  return HELP[kind] ?? ['help', 'clear']
}

export function runCommand(
  scenario: Scenario,
  nodeId: string,
  kind: string,
  lastRun: AnyRunResult | undefined,
  scrubberT: number,
  cmdRaw: string,
): string[] {
  const cmd = cmdRaw.trim()
  const lower = cmd.toLowerCase()
  const status = nodeStatusAt(scenario, nodeId, scrubberT)
  const orderId = extractOrderId(cmd)

  if (lower === 'help') return [`available: ${helpFor(kind).join(', ')}`]
  if (lower === '') return []

  if (kind === 'worker') {
    const idxMatch = nodeId.match(/^worker-(\d+)$/)
    const idx = idxMatch ? Number(idxMatch[1]) : -1
    const isKillTarget = idx === scenario.params.kill.workerIndex
    const down = status === 'down'

    if (lower === 'ps') {
      return down
        ? ['PID    COMMAND', '--     (process not running)']
        : ['PID    COMMAND', '1842   node worker.js --consume payments']
    }
    if (lower === 'status') {
      return down
        ? [`${nodeId}: DOWN — killed at ${fmtT(scenario.params.kill.atMs)}, restart scheduled ${fmtT(scenario.params.kill.restartAtMs)}`]
        : [`${nodeId}: RUNNING`]
    }
    if (lower === 'uptime') {
      if (down) return ['process not running']
      const since = isKillTarget && scrubberT >= scenario.params.kill.restartAtMs ? scenario.params.kill.restartAtMs : 0
      return [`up ${fmtT(scrubberT - since)}`]
    }
    if (lower.startsWith('logs') || lower.startsWith('tail')) {
      const lines = tail(
        lastRun,
        scrubberT,
        [
          'charge.attempt',
          'charge.success',
          'charge.deduped',
          'charge.failed',
          'queue.deliver',
          'queue.redeliver',
          'queue.visibility_timeout',
          'queue.ack',
          'db.read',
          'db.write',
          'order.settled',
        ],
        orderId ? 40 : 14,
        orderId,
      )
      return down ? [...lines, `-- ${nodeId} process exited, no further output --`] : lines
    }
    return [`command not found: ${cmd}`, `try: ${helpFor(kind).join(', ')}`]
  }

  if (kind === 'queue') {
    if (lower === 'depth') return [`payments-queue depth: ${queueDepthAt(lastRun?.log, scrubberT)}`]
    if (lower.startsWith('peek')) {
      return tail(lastRun, scrubberT, ['queue.enqueue', 'queue.deliver', 'queue.redeliver', 'queue.ack', 'queue.visibility_timeout'], orderId ? 40 : 10, orderId)
    }
    return [`command not found: ${cmd}`, `try: ${helpFor(kind).join(', ')}`]
  }

  if (kind === 'db' && scenario.domain === 'iot') {
    const snapshot = (lastRun as IotRunResult | undefined)?.dbSnapshot
    if (lower === '\\dt')
      return [
        '           List of relations',
        ' Schema |     Name      | Type',
        '--------+---------------+-------',
        ' public | packets       | table',
        ' public | line_status   | table',
        ' public | shift_totals  | table',
      ]
    if (lower.startsWith('select') && lower.includes('line_status')) {
      const rows = snapshot?.statuses ?? []
      if (rows.length === 0) return ['(0 rows)']
      const header = ' line_id | up    | ts'
      const sep = '---------+-------+-------'
      const body = rows.map((r) => ` ${r.lineId.padEnd(7)} | ${String(r.up).padEnd(5)} | ${r.ts}`)
      return [header, sep, ...body, `(${rows.length} rows)`]
    }
    if (lower.startsWith('select') && lower.includes('shift_totals')) {
      const rows = snapshot?.shifts ?? []
      if (rows.length === 0) return ['(0 rows)']
      const header = ' shift_id                       | good  | reject | downtime_ms'
      const sep = '---------------------------------+-------+--------+-------------'
      const body = rows.map((r) => ` ${r.shiftId.padEnd(31)} | ${String(r.good).padEnd(5)} | ${String(r.reject).padEnd(6)} | ${r.downtimeMs}`)
      return [header, sep, ...body, `(${rows.length} rows)`]
    }
    if (lower.startsWith('select')) {
      const rows = snapshot?.packets ?? []
      const filtered = rows.slice(-8)
      if (filtered.length === 0) return ['(0 rows)']
      const header = ' line_id | pts     | ptc  | sr1  | sr2  | ss1 | ss2'
      const sep = '---------+---------+------+------+------+-----+----'
      const body = filtered.map(
        (p) => ` ${p.lineId.padEnd(7)} | ${String(p.pts).padEnd(7)} | ${String(p.ptc).padEnd(4)} | ${String(p.sr1).padEnd(4)} | ${String(p.sr2).padEnd(4)} | ${p.ss1}   | ${p.ss2}`,
      )
      return [header, sep, ...body, `(${rows.length} rows total, showing ${filtered.length})`]
    }
    return [`command not found: ${cmd}`, `try: ${helpFor(kind).join(', ')}`]
  }

  if (kind === 'db') {
    if (lower === '\\dt') return ['       List of relations', ' Schema |  Name  | Type', '--------+--------+-------', ' public | orders | table']
    if (lower.startsWith('select')) {
      const rows = (lastRun as RunResult | undefined)?.dbSnapshot ?? []
      const filtered = orderId ? rows.filter((r) => r.id === orderId) : rows
      if (filtered.length === 0) return orderId ? [`(0 rows — ${orderId} not found)`] : ['(0 rows)']
      const sample = filtered.slice(0, 8)
      const header = ' id       | status   | total'
      const sep = '----------+----------+-------'
      const body = sample.map((r) => ` ${r.id.padEnd(8)} | ${r.status.padEnd(8)} | ${r.total}`)
      return [header, sep, ...body, `(${filtered.length} row${filtered.length === 1 ? '' : 's'} total, showing ${sample.length})`]
    }
    return [`command not found: ${cmd}`, `try: ${helpFor(kind).join(', ')}`]
  }

  if (kind === 'device') {
    if (lower === 'status') {
      return status === 'down' ? [`${nodeId}: DOWN`] : [`${nodeId}: UP`]
    }
    if (lower.startsWith('logs')) {
      return tail(lastRun, scrubberT, ['packet.generated', 'device.restart'], 14)
    }
    return [`command not found: ${cmd}`, `try: ${helpFor(kind).join(', ')}`]
  }

  if (kind === 'lambda') {
    if (lower === 'ps') return ['PID    COMMAND', '3310   node ' + nodeId + '.js']
    if (lower.startsWith('logs')) {
      const kinds =
        nodeId === 'shift-aggregator'
          ? ['cron.tick', 'shift.commit']
          : ['packet.ingested', 'line.status.write', 'line.status.stale']
      return tail(lastRun, scrubberT, kinds, 14)
    }
    return [`command not found: ${cmd}`, `try: ${helpFor(kind).join(', ')}`]
  }

  if (kind === 'cron') {
    if (lower === 'status') return [`${nodeId}: scheduled every 1.0s`]
    if (lower.startsWith('logs')) return tail(lastRun, scrubberT, ['cron.tick'], 14)
    return [`command not found: ${cmd}`, `try: ${helpFor(kind).join(', ')}`]
  }

  if (kind === 'frontend') {
    if (lower.startsWith('curl')) {
      return ['HTTP/1.1 200 OK', 'content-type: application/json', '', `{"status":"ok","node":"${nodeId}"}`]
    }
    if (lower.startsWith('logs')) return tail(lastRun, scrubberT, ['frontend.getStats'], 14)
    return [`command not found: ${cmd}`, `try: ${helpFor(kind).join(', ')}`]
  }

  if (kind === 'external') {
    if (lower === 'status') {
      if (status !== 'degraded') return [`${nodeId}: OK`]
      const { spike, failureWindow } = scenario.params
      const latencyActive = scrubberT >= spike.startMs && scrubberT < spike.endMs
      return latencyActive
        ? [`${nodeId}: DEGRADED — p99 latency elevated since ${fmtT(spike.startMs)}`]
        : [`${nodeId}: DEGRADED — error rate elevated since ${fmtT(failureWindow.startMs)} (~${Math.round(failureWindow.rate * 100)}% failing)`]
    }
    if (lower.startsWith('logs')) {
      const kinds =
        nodeId === 'payment-gateway'
          ? ['charge.attempt', 'charge.success', 'charge.deduped', 'charge.failed']
          : ['http.call', 'http.result']
      return tail(lastRun, scrubberT, kinds, orderId ? 40 : 14, orderId)
    }
    return [`command not found: ${cmd}`, `try: ${helpFor(kind).join(', ')}`]
  }

  if (kind === 'gateway' && scenario.domain === 'iot') {
    if (lower.startsWith('curl')) {
      return ['HTTP/1.1 200 OK', 'content-type: application/json', '', `{"status":"ok","node":"${nodeId}"}`]
    }
    if (lower.startsWith('logs')) return tail(lastRun, scrubberT, ['packet.ingested'], 14)
    return [`command not found: ${cmd}`, `try: ${helpFor(kind).join(', ')}`]
  }

  if (kind === 'api' || kind === 'gateway') {
    if (lower.startsWith('curl')) {
      return ['HTTP/1.1 200 OK', 'content-type: application/json', '', `{"status":"ok","node":"${nodeId}"}`]
    }
    if (lower === 'ps') return ['PID    COMMAND', '2201   node orders-api.js']
    if (lower.startsWith('logs'))
      return tail(
        lastRun,
        scrubberT,
        ['request.accepted', 'request.completed', 'request.failed', 'http.call', 'http.result', 'db.create'],
        orderId ? 40 : 14,
        orderId,
      )
    return [`command not found: ${cmd}`, `try: ${helpFor(kind).join(', ')}`]
  }

  return [`command not found: ${cmd}`]
}
