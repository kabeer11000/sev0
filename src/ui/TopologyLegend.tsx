function LegendPill({ color, dashed, children }: { color: string; dashed?: boolean; children: React.ReactNode }) {
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        color: 'var(--fg-muted)',
      }}
    >
      <span
        className="inline-block h-2 w-2 shrink-0"
        style={{
          background: dashed ? 'transparent' : color,
          border: dashed ? `1.5px dashed ${color}` : 'none',
          borderRadius: dashed ? '2px' : '999px',
        }}
      />
      {children}
    </span>
  )
}

export function TopologyLegend() {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5 border-t px-3 py-2"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <LegendPill color="var(--fg-faint)">healthy</LegendPill>
      <LegendPill color="var(--warn)">degraded</LegendPill>
      <LegendPill color="var(--crit)">down</LegendPill>
      <LegendPill color="var(--fg-faint)" dashed>sealed</LegendPill>
    </div>
  )
}