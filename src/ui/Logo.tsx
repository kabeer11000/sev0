// A built-from-scratch monospace wordmark — no icon, no square. The blinking
// underscore reads as a shell prompt, which is the whole point of the product.
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const fontSize = size === 'sm' ? 13.5 : 17
  return (
    <span
      className="inline-flex items-baseline font-mono font-bold"
      style={{ fontSize, letterSpacing: '-0.03em', color: 'var(--fg)', lineHeight: 1 }}
    >
      sev
      <span style={{ color: 'var(--accent)' }}>0</span>
      <span className="cursor-blink" style={{ color: 'var(--accent)', marginLeft: '0.06em' }}>
        _
      </span>
    </span>
  )
}
