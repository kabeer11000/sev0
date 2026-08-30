import type { ReactNode } from 'react'

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'crit'
type Size = 'sm' | 'md'

const TONE_STYLES: Record<Tone, { background: string; color: string; border?: string }> = {
  neutral: { background: 'var(--surface)', color: 'var(--fg-muted)', border: '1px solid var(--border)' },
  accent: { background: 'var(--accent-dim)', color: 'var(--accent-strong)' },
  ok: { background: 'var(--ok-bg)', color: 'var(--ok)' },
  warn: { background: 'var(--warn-bg)', color: 'var(--warn)' },
  crit: { background: 'var(--crit-bg)', color: 'var(--crit)' },
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'rounded-md px-2 py-0.5 text-[11px] font-medium',
  md: 'rounded-md px-2.5 py-1 text-[12px] font-medium',
}

export function Chip({
  tone = 'neutral',
  size = 'sm',
  children,
  className,
}: {
  tone?: Tone
  size?: Size
  children: ReactNode
  className?: string
}) {
  const toneStyle = TONE_STYLES[tone]
  return (
    <span
      className={`inline-flex items-center gap-1 ${SIZE_CLASS[size]} ${className ?? ''}`}
      style={{ background: toneStyle.background, color: toneStyle.color, border: toneStyle.border }}
    >
      {children}
    </span>
  )
}