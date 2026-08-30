// Deterministic initials avatar — no upload, no third-party lookup. Same
// name always produces the same color, so a returning player's avatar
// stays visually consistent everywhere without any stored image.
const PALETTE = ['#ff5c33', '#45b36b', '#f5a623', '#5c9aff', '#c85cff', '#ff5c8a', '#2fd0c9']

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  const color = PALETTE[hashString(name) % PALETTE.length]
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-mono font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `${color}26`,
        color,
        border: `1px solid ${color}66`,
        lineHeight: 1,
      }}
      title={name}
    >
      {initialsFor(name)}
    </span>
  )
}
