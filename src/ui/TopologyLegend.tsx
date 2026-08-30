function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
}

export function TopologyLegend() {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t px-3 py-2 font-mono text-[10px]"
      style={{ borderColor: 'var(--border)', color: 'var(--fg-faint)' }}
    >
      <span className="flex items-center gap-1.5">
        <Dot color="var(--fg-faint)" /> healthy
      </span>
      <span className="flex items-center gap-1.5">
        <Dot color="var(--warn)" /> degraded
      </span>
      <span className="flex items-center gap-1.5">
        <Dot color="var(--crit)" /> down
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 shrink-0 rounded-[2px] border" style={{ borderColor: 'var(--border-strong)', borderStyle: 'dashed' }} />
        sealed
      </span>
    </div>
  )
}
