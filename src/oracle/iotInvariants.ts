import { EventLog } from '../kernel/types'
import type { InvariantResult, OracleMetric, OracleReport } from './invariants'
import type { IotParams } from '../scenario/types'
import { shiftIdFor } from '../sim/oeeShift'

// Runs entirely over the event log plus the scenario's iot params (needed to
// know the fan-out map and shift schedule), same convention as
// evaluateInvariants — the same function grades the client preview run and
// every hidden-seed submission run.
export function evaluateIotInvariants(log: EventLog, iot: IotParams): OracleReport {
  const mirrorTargets = new Map<string, string[]>()
  for (const line of iot.lines) {
    if (!line.mirrorOf) continue
    mirrorTargets.set(line.mirrorOf, [...(mirrorTargets.get(line.mirrorOf) ?? []), line.id])
  }

  const expectedIngested = new Set<string>()
  const actualIngested = new Set<string>()
  const lastAcceptedTsByLine = new Map<string, number>()
  const outOfOrderLines = new Set<string>()
  let staleRejections = 0

  // ingested packets, per line, in ARRIVAL order (log order) — reordered by
  // pts below before the reset-aware replay, since a deliberately-delayed
  // packet can be ingested after a later one and must not be mistaken for a
  // device reset just because it arrived out of order
  const ingestedByLine = new Map<string, { pts: number; sr1: number; sr2: number }[]>()

  // what the guest's shift-aggregator actually committed
  const actualTotals = new Map<string, { good: number; reject: number }>()

  for (const e of log.all()) {
    switch (e.kind) {
      case 'packet.generated': {
        const sourceLineId = e.node!
        for (const target of [sourceLineId, ...(mirrorTargets.get(sourceLineId) ?? [])]) {
          expectedIngested.add(`${target}:${e.t}`)
        }
        break
      }
      case 'packet.ingested': {
        const lineId = e.node!
        const pts = (e.detail?.pts as number) ?? e.t
        actualIngested.add(`${lineId}:${pts}`)
        const sr1 = e.detail?.sr1 as number
        const sr2 = e.detail?.sr2 as number
        const list = ingestedByLine.get(lineId) ?? []
        list.push({ pts, sr1, sr2 })
        ingestedByLine.set(lineId, list)
        break
      }
      case 'line.status.write': {
        const lineId = e.node!
        const ts = (e.detail?.ts as number) ?? e.t
        const last = lastAcceptedTsByLine.get(lineId)
        if (last != null && ts < last) outOfOrderLines.add(lineId)
        lastAcceptedTsByLine.set(lineId, Math.max(last ?? -Infinity, ts))
        break
      }
      case 'line.status.stale':
        staleRejections++
        break
      case 'shift.commit': {
        const shiftId = e.detail?.shiftId as string
        const delta = e.detail?.delta as { good: number; reject: number } | undefined
        const totals = actualTotals.get(shiftId) ?? { good: 0, reject: 0 }
        totals.good += delta?.good ?? 0
        totals.reject += delta?.reject ?? 0
        actualTotals.set(shiftId, totals)
        break
      }
    }
  }

  // reference (correct) reset-aware replay, computed independently by the
  // oracle in pts order per line — this is what actually catches the
  // counter-reset bug
  const refTotals = new Map<string, { good: number; reject: number }>()
  for (const [lineId, packets] of ingestedByLine) {
    packets.sort((a, b) => a.pts - b.pts)
    let last: { sr1: number; sr2: number } | undefined
    for (const p of packets) {
      const shiftId = shiftIdFor(iot, lineId, p.pts)
      const totals = refTotals.get(shiftId) ?? { good: 0, reject: 0 }
      if (last) {
        totals.good += p.sr1 < last.sr1 ? p.sr1 : p.sr1 - last.sr1
        totals.reject += p.sr2 < last.sr2 ? p.sr2 : p.sr2 - last.sr2
      }
      refTotals.set(shiftId, totals)
      last = { sr1: p.sr1, sr2: p.sr2 }
    }
  }

  const missingIngested = [...expectedIngested].filter((k) => !actualIngested.has(k))
  const extraIngested = [...actualIngested].filter((k) => !expectedIngested.has(k))

  const mismatchedShifts: string[] = []
  for (const [shiftId, ref] of refTotals) {
    const actual = actualTotals.get(shiftId) ?? { good: 0, reject: 0 }
    if (actual.good !== ref.good || actual.reject !== ref.reject) mismatchedShifts.push(shiftId)
  }

  const results: InvariantResult[] = [
    {
      key: 'ingest-completeness',
      title: 'Every packet lands (including fan-out copies) exactly once',
      passed: missingIngested.length === 0 && extraIngested.length === 0,
      detail:
        missingIngested.length === 0 && extraIngested.length === 0
          ? `${actualIngested.size} packet deliveries ingested, all accounted for`
          : `${missingIngested.length} delivery(ies) never made it, ${extraIngested.length} unexpected — e.g. ${missingIngested[0] ?? extraIngested[0]}`,
    },
    {
      key: 'status-order-integrity',
      title: "A line's stored status is never overwritten by an older packet",
      passed: outOfOrderLines.size === 0,
      detail:
        outOfOrderLines.size === 0
          ? `${lastAcceptedTsByLine.size} line(s) tracked, all writes applied in order (${staleRejections} stale write(s) correctly rejected)`
          : `${outOfOrderLines.size} line(s) had a stale packet overwrite a fresher status — e.g. ${[...outOfOrderLines][0]}`,
    },
    {
      key: 'shift-count-integrity',
      title: "Every shift's good/reject totals match the raw counters (including device restarts)",
      passed: mismatchedShifts.length === 0,
      detail:
        mismatchedShifts.length === 0
          ? `${refTotals.size} shift(s) checked, all totals match`
          : `${mismatchedShifts.length} of ${refTotals.size} shift(s) have wrong totals — e.g. ${mismatchedShifts[0]}`,
    },
  ]

  const oeeMetrics: OracleMetric[] = [...actualTotals.entries()].map(([shiftId, totals]) => {
    const total = totals.good + totals.reject
    const quality = total > 0 ? totals.good / total : 1
    return { key: `oee:${shiftId}`, label: shiftId, value: `${total} parts, ${Math.round(quality * 100)}% quality` }
  })

  const metrics: OracleMetric[] = [
    { key: 'packetsIngested', label: 'packet deliveries ingested', value: `${actualIngested.size}` },
    { key: 'staleRejections', label: 'stale writes rejected', value: `${staleRejections}` },
    {
      key: 'shiftsMismatched',
      label: 'shifts with wrong totals',
      value: `${mismatchedShifts.length} / ${refTotals.size}`,
      warn: mismatchedShifts.length > 0,
    },
    ...oeeMetrics,
  ]

  return { results, metrics, passed: results.every((r) => r.passed) }
}
