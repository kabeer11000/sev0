export interface TopologyNode {
  id: string
  label: string
  kind: 'gateway' | 'api' | 'queue' | 'worker' | 'db' | 'external' | 'cache' | 'device' | 'lambda' | 'cron' | 'frontend'
  sealed: boolean
  note?: string
  /** vfs path this node's behavior comes from, if any — drives "Open file" in its context menu */
  file?: string
}

export interface OeeTenant {
  id: string
  /** length of one recurring "day" of shifts, ms */
  dayLengthMs: number
  /** this tenant's day-boundary offset from sim t=0 — different plants, different clocks */
  dayOffsetMs: number
  /** the day is divided into equal-length shifts, one label each */
  shiftLabels: string[]
}

export interface OeeLine {
  id: string
  tenantId: string
  /** if set, this line has no sensor of its own — it mirrors another line's packets
   * (a shared conveyor/sensor feeding multiple downstream lines) */
  mirrorOf?: string
  /** nameplate cycle time per unit, ms — used for the OEE Performance component */
  idealCycleMs: number
}

export interface IotParams {
  tenants: OeeTenant[]
  lines: OeeLine[]
  heartbeatIntervalMs: number
  ingestJitterMs: number
  /** a line with no packet for this long is treated as disconnected (down) */
  disconnectTimeoutMs: number
  /** fraction of packets that increment the reject counter instead of the good counter */
  rejectRate: number
  /** the line's sensor reboots at atMs — its ptc/sr1/sr2 counters drop back to 0 */
  deviceRestart: { lineId: string; atMs: number }
  /** forces the status-ordering race: `lineId` goes really down at `downAtMs`, but the
   * 'up' packet sent just before it is delayed past that so it arrives later */
  statusFlap: { lineId: string; downAtMs: number; backUpAtMs: number; delayedPacketLatencyMs: number }
  /** the line's sensor goes completely silent for this window (distinct from a restart) */
  disconnectWindow: { lineId: string; startMs: number; endMs: number }
}

export interface ScenarioSolution {
  /** what was actually wrong and why the fix works — shown alongside the code */
  explanation: string
  /** the corrected content for each editable file, in the same order as editableFiles */
  files: { path: string; code: string }[]
}

export interface Scenario {
  id: string
  caseId: string
  /** the real, diagnostic name — revealed only after the player actually fixes it */
  title: string
  /** symptom-based, written before anyone knew the cause — shown up front */
  displayTitle: string
  severity: 'SEV0' | 'SEV1' | 'SEV2'
  /** roughly how hard this is to diagnose and fix — shown on the incident card */
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard'
  /** real wall-clock time budget for resolving this incident, ms */
  timeLimitMs: number
  incidentReport: string[]
  /** which sim engine + runner this scenario runs on */
  domain: 'checkout' | 'iot'
  topology: { nodes: TopologyNode[]; edges: [string, string][] }
  editableFiles: { path: string; starter: string }[]
  /** progressive nudges, least to most specific — shown one at a time on request */
  hints: string[]
  /** the full answer, gated behind an explicit "I'm stuck" confirmation in the UI */
  solution: ScenarioSolution
  params: {
    durationMs: number
    drainMs: number
    ratePerMs: number
    workerCount: number
    visibilityTimeoutMs: number
    dbReadLatencyMs: number
    dbWriteLatencyMs: number
    httpBaseLatencyMs: number
    riskCheckLatencyMs: number
    spike: { startMs: number; endMs: number; latencyMs: number }
    kill: { workerIndex: number; atMs: number; restartAtMs: number }
    failureWindow: { startMs: number; endMs: number; rate: number }
    invariants: {
      settleWindowMs: number
      latencyBudgetMs: number
      externalCallBudget: number
      gateExternalCallBudget?: boolean
    }
    /** only present for domain: 'iot' scenarios */
    iot?: IotParams
  }
  practiceSeed: number
  hiddenSeeds: number[]
}
