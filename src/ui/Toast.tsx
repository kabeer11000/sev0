import { useEffect, useState } from 'react'
import { useSev0Store } from '../store'
import type { ToastItem } from '../store'
import { SparkleIcon } from './SparkleIcon'

const TTL_MS = 3800

interface ToneLook {
  accent: string
  gradient: string
  bubble: string
  chipBg: string
  chipFg: string
}

function toneLook(tone: ToastItem['tone']): ToneLook {
  switch (tone) {
    case 'accent':
      return {
        accent: 'var(--accent-strong)',
        gradient: 'linear-gradient(135deg, #fff5ec 0%, var(--accent-dim) 100%)',
        bubble: 'var(--accent)',
        chipBg: 'rgba(255,255,255,0.75)',
        chipFg: 'var(--accent-strong)',
      }
    case 'ok':
      return {
        accent: 'var(--ok)',
        gradient: 'linear-gradient(135deg, #f1faf3 0%, var(--ok-bg) 100%)',
        bubble: 'var(--ok)',
        chipBg: 'rgba(255,255,255,0.75)',
        chipFg: 'var(--ok)',
      }
    case 'warn':
      return {
        accent: 'var(--warn)',
        gradient: 'linear-gradient(135deg, #fff8eb 0%, var(--warn-bg) 100%)',
        bubble: 'var(--warn)',
        chipBg: 'rgba(255,255,255,0.75)',
        chipFg: 'var(--warn)',
      }
    case 'crit':
      return {
        accent: 'var(--crit)',
        gradient: 'linear-gradient(135deg, #fdecea 0%, var(--crit-bg) 100%)',
        bubble: 'var(--crit)',
        chipBg: 'rgba(255,255,255,0.75)',
        chipFg: 'var(--crit)',
      }
    default:
      return {
        accent: 'var(--fg)',
        gradient: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--surface) 100%)',
        bubble: 'var(--fg-muted)',
        chipBg: 'var(--surface)',
        chipFg: 'var(--fg)',
      }
  }
}

function ToneIcon({ tone }: { tone: ToastItem['tone'] }) {
  const c = 'white'
  if (tone === 'ok') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12 L 10 17 L 19 7" />
      </svg>
    )
  }
  if (tone === 'crit') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 8 L 16 16 M 16 8 L 8 16" />
      </svg>
    )
  }
  if (tone === 'warn') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 7 L 12 14" />
        <circle cx="12" cy="17.4" r="1.1" fill={c} />
      </svg>
    )
  }
  // accent + default
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={c} aria-hidden>
      <path d="M12 2 L 14 10 L 22 12 L 14 14 L 12 22 L 10 14 L 2 12 L 10 10 Z" />
    </svg>
  )
}

function ToastCard({ toast, idx }: { toast: ToastItem; idx: number }) {
  const [progress, setProgress] = useState(1)
  const dismissToast = useSev0Store((s) => s.dismissToast)
  const look = toneLook(toast.tone)

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / TTL_MS)
      setProgress(1 - t)
      if (t < 1) raf = requestAnimationFrame(tick)
      else dismissToast(toast.id)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [toast.id, dismissToast])

  return (
    <div
      role="status"
      onClick={() => dismissToast(toast.id)}
      className="pointer-events-auto relative cursor-pointer"
      style={{
        width: 360,
        padding: 14,
        paddingLeft: 16,
        borderRadius: 28,
        background: look.gradient,
        boxShadow: '0 10px 30px rgba(43, 36, 28, 0.18), 0 0 0 1px rgba(255,255,255,0.6) inset',
        animation: 'toast-claim-fun 480ms cubic-bezier(0.34, 1.80, 0.64, 1) both',
        animationDelay: `${idx * 60}ms`,
        overflow: 'hidden',
      }}
    >
      {/* soft bubble behind icon — adds the 'pillowy' feel */}
      <span
        aria-hidden
        className="absolute -left-6 -top-6 block"
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: `radial-gradient(circle at center, ${look.bubble}33 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      {/* sparkle accents */}
      <span
        aria-hidden
        className="sparkle-spin absolute"
        style={{ right: 14, top: 12, color: look.accent, opacity: 0.65 }}
      >
        <SparkleIcon size={14} />
      </span>
      <span
        aria-hidden
        className="sparkle-spin absolute"
        style={{ right: 38, bottom: 16, color: look.accent, opacity: 0.4, animationDuration: '5.5s' }}
      >
        <SparkleIcon size={10} />
      </span>

      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: look.bubble, boxShadow: `0 4px 12px ${look.bubble}55` }}
        >
          <ToneIcon tone={toast.tone} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
          <span className="text-[14px] font-bold leading-snug" style={{ color: 'var(--fg)', letterSpacing: '-0.005em' }}>
            {toast.text}
          </span>
          {toast.breakdown && toast.breakdown.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {toast.breakdown.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between font-mono text-[11.5px] tabular-nums"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  <span>{row.label}</span>
                  <span
                    className="rounded-full px-1.5"
                    style={{
                      background: row.value < 0 ? 'var(--crit-bg)' : 'rgba(255,255,255,0.7)',
                      color: row.value < 0 ? 'var(--crit)' : 'var(--fg)',
                    }}
                  >
                    {row.value > 0 ? `+${row.value}` : row.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* TTL pill — runs along the bottom */}
      <div
        className="absolute inset-x-4 bottom-1.5 h-[3px] overflow-hidden rounded-full"
        style={{ background: 'rgba(43,36,28,0.08)' }}
      >
        <div
          className="h-full"
          style={{
            width: `${progress * 100}%`,
            background: look.bubble,
            transition: 'width 100ms linear',
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  )
}

export function Toast() {
  const toasts = useSev0Store((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex flex-col-reverse items-center gap-3">
      {toasts.map((t, idx) => (
        <ToastCard key={t.id} toast={t} idx={toasts.length - 1 - idx} />
      ))}
    </div>
  )
}
