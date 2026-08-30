import { useState } from 'react'
import { signIn, signUp } from '../authClient'
import { Mascot } from './Mascot'

function KeyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="6" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 7.5 L 14 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 4 L 14 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="4" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 6 L 8 9.5 L 13 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 14 C 3 11 5 9.5 8 9.5 C 11 9.5 13 11 13 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4 L 12 12 M 12 4 L 4 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function passwordStrength(pw: string): { score: number; label: string; tone: 'crit' | 'warn' | 'ok' } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'weak', tone: 'crit' }
  if (score <= 2) return { score, label: 'ok', tone: 'warn' }
  return { score, label: 'strong', tone: 'ok' }
}

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)
    setBusy(true)
    try {
      const result =
        mode === 'signup' ? await signUp.email({ name, email, password }) : await signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message ?? 'Something went wrong')
        return
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const switchingMode = (next: 'signin' | 'signup') => {
    if (busy) return
    setMode(next)
    setError(undefined)
  }

  const strength = mode === 'signup' && password ? passwordStrength(password) : null
  const tone = strength?.tone ?? 'crit'
  const toneVar = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : 'var(--crit)'
  const toneBg = tone === 'ok' ? 'var(--ok-bg)' : tone === 'warn' ? 'var(--warn-bg)' : 'var(--crit-bg)'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(43, 36, 28, 0.40)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-3xl"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* hero band: mascot + close */}
        <div
          className="relative flex items-center gap-3 px-6 pb-5 pt-6"
          style={{
            background:
              'linear-gradient(160deg, var(--accent-dim) 0%, rgba(245, 216, 200, 0.30) 60%, transparent 100%)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="mascot-breathe">
            <Mascot mood={mode === 'signup' ? 'excited' : 'happy'} />
          </div>
          <div className="flex flex-1 flex-col">
            <span className="text-[10.5px] font-bold uppercase" style={{ color: 'var(--accent-strong)', letterSpacing: '0.10em' }}>
              {mode === 'signup' ? 'Join the queue' : 'Welcome back'}
            </span>
            <span className="text-[17px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
              {mode === 'signup' ? 'Create an account' : 'Sign in'}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--fg-faint)' }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* segmented mode switch */}
        <div className="px-6 pt-4">
          <div
            className="flex h-9 rounded-full p-1"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <button
              type="button"
              onClick={() => switchingMode('signin')}
              className="flex-1 rounded-full text-[12.5px] font-semibold transition-all duration-200"
              style={{
                background: mode === 'signin' ? 'var(--bg-elevated)' : 'transparent',
                color: mode === 'signin' ? 'var(--fg)' : 'var(--fg-faint)',
                boxShadow: mode === 'signin' ? '0 1px 3px rgba(43,36,28,0.10)' : 'none',
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchingMode('signup')}
              className="flex-1 rounded-full text-[12.5px] font-semibold transition-all duration-200"
              style={{
                background: mode === 'signup' ? 'var(--bg-elevated)' : 'transparent',
                color: mode === 'signup' ? 'var(--fg)' : 'var(--fg-faint)',
                boxShadow: mode === 'signup' ? '0 1px 3px rgba(43,36,28,0.10)' : 'none',
              }}
            >
              Create account
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-2.5 px-6 pb-6 pt-4">
          {mode === 'signup' && (
            <label className="flex items-center gap-2.5 rounded-full border pl-3.5 pr-1 transition-colors focus-within:border-[var(--accent)]" style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)' }}>
              <span style={{ color: 'var(--fg-faint)' }}><UserIcon /></span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                className="h-10 flex-1 bg-transparent text-[13.5px] outline-none"
                style={{ color: 'var(--fg)' }}
              />
            </label>
          )}
          <label className="flex items-center gap-2.5 rounded-full border pl-3.5 pr-1 transition-colors focus-within:border-[var(--accent)]" style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)' }}>
            <span style={{ color: 'var(--fg-faint)' }}><MailIcon /></span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              className="h-10 flex-1 bg-transparent text-[13.5px] outline-none"
              style={{ color: 'var(--fg)' }}
            />
          </label>
          <label className="flex items-center gap-2.5 rounded-full border pl-3.5 pr-1 transition-colors focus-within:border-[var(--accent)]" style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)' }}>
            <span style={{ color: 'var(--fg-faint)' }}><KeyIcon /></span>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="h-10 flex-1 bg-transparent text-[13.5px] outline-none"
              style={{ color: 'var(--fg)' }}
            />
          </label>

          {strength && (
            <div className="flex items-center gap-2 px-1 pt-0.5">
              <div className="flex h-1 flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      background: i < strength.score ? toneVar : 'var(--border)',
                      transition: 'background 200ms ease',
                    }}
                  />
                ))}
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                style={{ background: toneBg, color: toneVar, letterSpacing: '0.06em' }}
              >
                {strength.label}
              </span>
            </div>
          )}

          {error && (
            <div
              className="rounded-2xl px-3 py-2 text-[12.5px]"
              style={{ background: 'var(--crit-bg)', color: 'var(--crit)' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full text-[14px] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-lg active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
            style={{
              background: 'linear-gradient(180deg, #f37c5a 0%, var(--accent) 60%, var(--accent-strong) 100%)',
              boxShadow: busy ? 'none' : '0 4px 14px rgba(238, 90, 54, 0.30)',
            }}
          >
            {busy && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          <p className="mt-1 text-center text-[11.5px] leading-relaxed" style={{ color: 'var(--fg-faint)' }}>
            Only used to save your resolved incidents and sync progress across devices.
          </p>
        </form>
      </div>
    </div>
  )
}
