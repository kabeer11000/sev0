import type { IotParams } from '../scenario/types'

// Pure — shared by the cron harness (downtime bucketing), the guest ctx
// (`ctx.shiftFor`), and the oracle's independent replay, so all three agree
// on shift boundaries by construction.
export function shiftIdFor(iot: IotParams, lineId: string, ts: number): string {
  const line = iot.lines.find((l) => l.id === lineId)
  if (!line) throw new Error(`unknown line ${lineId}`)
  const tenant = iot.tenants.find((t) => t.id === line.tenantId)
  if (!tenant) throw new Error(`unknown tenant ${line.tenantId}`)

  const sinceEpoch = ts - tenant.dayOffsetMs
  const dayIndex = Math.floor(sinceEpoch / tenant.dayLengthMs)
  const local = ((sinceEpoch % tenant.dayLengthMs) + tenant.dayLengthMs) % tenant.dayLengthMs
  const shiftLenMs = tenant.dayLengthMs / tenant.shiftLabels.length
  const shiftIndex = Math.min(tenant.shiftLabels.length - 1, Math.floor(local / shiftLenMs))

  return `${lineId}@${tenant.id}-d${dayIndex}-${tenant.shiftLabels[shiftIndex]}`
}
