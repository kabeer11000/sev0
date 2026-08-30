import type { Scenario } from '../scenario/types'
import type { EventLog } from '../kernel/types'

export type NodeStatus = 'ok' | 'degraded' | 'down'

// every worker replica runs the exact same file — killing one doesn't
// change the code, it changes which replica is running it
export function fileForNode(scenario: Scenario, nodeId: string): string | undefined {
  return scenario.topology.nodes.find((n) => n.id === nodeId)?.file
}

export function nodesForFile(scenario: Scenario, path: string): string[] {
  return scenario.topology.nodes.filter((n) => n.file === path).map((n) => n.id)
}

export function nodeStatusAt(scenario: Scenario, nodeId: string, t: number): NodeStatus {
  const { params } = scenario
  if (nodeId === 'payment-gateway') {
    if (t >= params.spike.startMs && t < params.spike.endMs) return 'degraded'
    if (t >= params.failureWindow.startMs && t < params.failureWindow.endMs && params.failureWindow.rate > 0) return 'degraded'
  }
  const workerMatch = nodeId.match(/^worker-(\d+)$/)
  if (workerMatch) {
    const idx = Number(workerMatch[1])
    if (idx === params.kill.workerIndex && t >= params.kill.atMs && t < params.kill.restartAtMs) return 'down'
  }
  if (params.iot) {
    const { statusFlap, disconnectWindow } = params.iot
    if (nodeId === statusFlap.lineId && t >= statusFlap.downAtMs && t < statusFlap.backUpAtMs) return 'down'
    if (nodeId === disconnectWindow.lineId && t >= disconnectWindow.startMs && t < disconnectWindow.endMs) return 'down'
  }
  return 'ok'
}

export function queueDepthAt(log: EventLog | undefined, t: number): number {
  if (!log) return 0
  let depth = 0
  for (const e of log.all()) {
    if (e.t > t) break
    if (e.kind === 'queue.enqueue') depth++
    if (e.kind === 'queue.ack') depth--
  }
  return Math.max(0, depth)
}

export function chargesAt(log: EventLog | undefined, t: number): { attempts: number; doubleChargedOrders: Set<string> } {
  if (!log) return { attempts: 0, doubleChargedOrders: new Set() }
  const counts = new Map<string, number>()
  let attempts = 0
  for (const e of log.all()) {
    if (e.t > t) break
    if (e.kind === 'charge.success') {
      attempts++
      counts.set(e.orderId!, (counts.get(e.orderId!) ?? 0) + 1)
    }
  }
  const doubleChargedOrders = new Set([...counts.entries()].filter(([, c]) => c > 1).map(([id]) => id))
  return { attempts, doubleChargedOrders }
}
