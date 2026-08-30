import { useEffect, useMemo, useRef, useState } from 'react'
import type { Scenario } from '../scenario/types'
import type { EventLog } from '../kernel/types'
import { nodeStatusAt, queueDepthAt, fileForNode } from './topologyState'
import type { NodeStatus } from './topologyState'
import { useSev0Store } from '../store'

const POS: Record<string, [number, number]> = {
  gateway: [36, 190],
  'orders-api': [172, 190],
  'risk-engine': [172, 55],
  postgres: [172, 330],
  'payments-queue': [320, 190],
  'worker-0': [472, 55],
  'worker-1': [472, 150],
  'worker-2': [472, 245],
  'worker-3': [472, 340],
  'payment-gateway': [616, 197],

  'line-1': [36, 20],
  'line-2': [36, 110],
  'line-3': [36, 200],
  'line-4': [36, 290],
  'iot-core': [190, 155],
  'dataentry-lambda': [340, 155],
  'cron-trigger': [190, 330],
  'shift-aggregator': [340, 330],
  'oee-db': [490, 240],
  'oee-dashboard': [616, 240],
}

const BASE_VB = { x: -30, y: -24, w: 730, h: 438 }
const MIN_W = BASE_VB.w / 3.5
const MAX_W = BASE_VB.w * 3

const STATUS_COLOR: Record<NodeStatus, string> = {
  ok: 'var(--border-strong)',
  degraded: 'var(--warn)',
  down: 'var(--crit)',
}

const KIND_GLYPH: Record<string, string> = {
  gateway: '▲',
  api: '◆',
  queue: '▤',
  worker: '●',
  db: '⛁',
  external: '◈',
  cache: '▦',
  device: '✦',
  lambda: 'λ',
  cron: '◷',
  frontend: '▣',
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text
}

function NodeBox({
  id,
  label,
  kind,
  sealed,
  status,
  sub,
  fileCaption,
  note,
  onContextMenu,
}: {
  id: string
  label: string
  kind: string
  sealed: boolean
  status: NodeStatus
  sub?: string
  fileCaption?: string
  note?: string
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  const [x, y] = POS[id]
  const w = 118
  const secondLine = sub ?? fileCaption ?? note
  const h = secondLine ? 54 : 42
  const stroke = STATUS_COLOR[status]
  const pulsing = status !== 'ok'
  const captionColor = sub ? 'var(--fg-muted)' : fileCaption ? 'var(--accent)' : 'var(--fg-faint)'
  const captionText = sub ?? (fileCaption ? `→ ${fileCaption}` : note)
  return (
    <g
      transform={`translate(${x - w / 2}, ${y - h / 2})`}
      onContextMenu={(e) => onContextMenu(e, id)}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ cursor: 'context-menu' }}
    >
      <rect
        width={w}
        height={h}
        rx={7}
        fill={status === 'ok' ? 'var(--surface)' : status === 'degraded' ? 'var(--warn-bg)' : 'var(--crit-bg)'}
        stroke={stroke}
        strokeWidth={status === 'ok' ? 1 : 1.6}
        strokeDasharray={sealed ? '3 2' : undefined}
        opacity={sealed ? 0.78 : 1}
      >
        {pulsing && <animate attributeName="opacity" values="1;0.55;1" dur="1.4s" repeatCount="indefinite" />}
      </rect>
      <text x={11} y={15} fontSize={9} fill="var(--fg-faint)" opacity={0.8}>
        {KIND_GLYPH[kind] ?? '○'}
      </text>
      <circle cx={w - 10} cy={10} r={3.5} fill={status === 'ok' ? 'var(--fg-faint)' : status === 'degraded' ? 'var(--warn)' : 'var(--crit)'}>
        {pulsing && <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />}
      </circle>
      <text x={w / 2} y={secondLine ? 25 : h / 2 + 4} textAnchor="middle" fontSize={10.5} fontFamily="var(--font-mono)" fill="var(--fg)" fontWeight={500}>
        {truncate(label, 17)}
        {label.length > 17 && <title>{label}</title>}
      </text>
      {captionText && (
        <text x={w / 2} y={38} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill={captionColor}>
          {truncate(captionText, 19)}
          {captionText.length > 19 && <title>{captionText}</title>}
        </text>
      )}
    </g>
  )
}

function FlowParticle({ x1, y1, x2, y2, delay }: { x1: number; y1: number; x2: number; y2: number; delay: number }) {
  return (
    <circle r={2} fill="var(--accent)" opacity={0}>
      <animateMotion path={`M${x1},${y1} L${x2},${y2}`} dur="2.2s" begin={`${delay}s`} repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.08;0.85;1" dur="2.2s" begin={`${delay}s`} repeatCount="indefinite" />
    </circle>
  )
}

function ZoomButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-6 w-6 items-center justify-center rounded font-mono text-[13px] leading-none"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--fg-muted)' }}
    >
      {children}
    </button>
  )
}

export function TopologyGraph({ scenario, log, t }: { scenario: Scenario; log?: EventLog; t: number }) {
  const depth = useMemo(() => queueDepthAt(log, t), [log, t])
  const openContextMenu = useSev0Store((s) => s.openContextMenu)
  const openFile = useSev0Store((s) => s.openFile)
  const openTerminal = useSev0Store((s) => s.openTerminal)
  const hasRun = !!log

  const [vb, setVb] = useState({ ...BASE_VB })
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ clientX: number; clientY: number; vb: typeof vb } | null>(null)
  const [dragging, setDragging] = useState(false)

  const zoomAt = (factor: number, clientX?: number, clientY?: number) => {
    const el = svgRef.current
    if (!el) return
    setVb((prev) => {
      const rect = el.getBoundingClientRect()
      const cx = clientX ?? rect.left + rect.width / 2
      const cy = clientY ?? rect.top + rect.height / 2
      const px = prev.x + ((cx - rect.left) / rect.width) * prev.w
      const py = prev.y + ((cy - rect.top) / rect.height) * prev.h
      const newW = Math.min(MAX_W, Math.max(MIN_W, prev.w * factor))
      const newH = newW * (BASE_VB.h / BASE_VB.w)
      return {
        x: px - ((px - prev.x) / prev.w) * newW,
        y: py - ((py - prev.y) / prev.h) * newH,
        w: newW,
        h: newH,
      }
    })
  }

  // React registers onWheel as a passive listener at the root, so
  // e.preventDefault() inside a JSX handler silently no-ops — our zoom still
  // applies but the browser's native pinch-zoom never actually gets blocked.
  // A real native listener is required to actually suppress it.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(e.deltaY > 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    dragRef.current = { clientX: e.clientX, clientY: e.clientY, vb }
    setDragging(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const start = dragRef.current
    const dxSvg = ((e.clientX - start.clientX) / rect.width) * start.vb.w
    const dySvg = ((e.clientY - start.clientY) / rect.height) * start.vb.h
    setVb({ ...start.vb, x: start.vb.x - dxSvg, y: start.vb.y - dySvg })
  }

  const handlePointerUp = () => {
    dragRef.current = null
    setDragging(false)
  }

  const resetView = () => setVb({ ...BASE_VB })
  const zoomPct = Math.round((BASE_VB.w / vb.w) * 100)

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    const node = scenario.topology.nodes.find((n) => n.id === id)!
    const file = fileForNode(scenario, id)
    openContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        ...(file ? [{ label: 'Open file', onClick: () => openFile(file) }] : []),
        { label: 'Open terminal', onClick: () => openTerminal(id) },
        { label: 'View config', onClick: () => openFile('infra/topology.yaml'), separatorBefore: true },
        { label: `Copy "${id}"`, onClick: () => navigator.clipboard?.writeText(id) },
        {
          label: node.sealed ? 'Restart (sealed — no access)' : 'Restart',
          onClick: () => {},
          disabled: true,
          separatorBefore: true,
        },
      ],
    })
  }

  return (
    <div className="relative h-full w-full overflow-hidden" data-allow-pinch-zoom style={{ background: 'var(--bg-elevated)' }}>
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        width="100%"
        height="100%"
        role="img"
        aria-label="System topology — scroll to zoom, drag to pan"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        <g stroke="var(--border)" strokeWidth={1}>
          {scenario.topology.edges.map(([a, b], i) => {
            const [x1, y1] = POS[a]
            const [x2, y2] = POS[b]
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
          })}
        </g>
        {hasRun &&
          scenario.topology.edges.map(([a, b], i) => {
            const [x1, y1] = POS[a]
            const [x2, y2] = POS[b]
            return <FlowParticle key={`p${i}`} x1={x1} y1={y1} x2={x2} y2={y2} delay={(i % 5) * 0.4} />
          })}
        <rect
          x={401}
          y={20}
          width={142}
          height={358}
          rx={10}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        <text x={472} y={14} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--fg-faint)">
          ×4 replicas, same code
        </text>
        {scenario.topology.nodes.map((n) => (
          <NodeBox
            key={n.id}
            id={n.id}
            label={n.label}
            kind={n.kind}
            sealed={n.sealed}
            status={nodeStatusAt(scenario, n.id, t)}
            sub={n.id === 'payments-queue' ? `depth ${depth}` : undefined}
            fileCaption={fileForNode(scenario, n.id)?.split('/').pop()}
            note={n.note}
            onContextMenu={handleContextMenu}
          />
        ))}
      </svg>

      <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-md p-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ZoomButton label="Zoom out" onClick={() => zoomAt(1.25)}>
            −
          </ZoomButton>
          <button
            onClick={resetView}
            title="Reset view"
            className="px-1.5 font-mono text-[10px] tabular-nums"
            style={{ color: 'var(--fg-faint)', minWidth: 34 }}
          >
            {zoomPct}%
          </button>
          <ZoomButton label="Zoom in" onClick={() => zoomAt(0.8)}>
            +
          </ZoomButton>
        </div>
      </div>
    </div>
  )
}
