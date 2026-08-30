import { useState } from 'react'
import { signIn, signUp } from '../authClient'

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[360px] rounded-lg"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <span className="font-mono text-[13px] font-semibold" style={{ color: 'var(--fg)' }}>
            {mode === 'signup' ? 'Create an account' : 'Sign in'}
          </span>
          <button onClick={onClose} aria-label="Close" className="font-mono text-[11px]" style={{ color: 'var(--fg-faint)' }}>
            close
          </button>
        </div>
        <p className="px-5 pb-1 pt-2 text-[12px] leading-relaxed" style={{ color: 'var(--fg-faint)' }}>
          Only used to save your resolved incidents to the leaderboard and sync progress. No verification email, nothing
          fancy.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-2.5 px-5 pb-5 pt-3">
          {mode === 'signup' && (
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              className="h-9 rounded-md border px-3 font-mono text-[12.5px] outline-none"
              style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)', color: 'var(--fg)' }}
            />
          )}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="h-9 rounded-md border px-3 font-mono text-[12.5px] outline-none"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)', color: 'var(--fg)' }}
          />
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="h-9 rounded-md border px-3 font-mono text-[12.5px] outline-none"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)', color: 'var(--fg)' }}
          />

          {error && (
            <div className="rounded-md px-3 py-2 font-mono text-[11.5px]" style={{ background: 'var(--crit-bg)', color: 'var(--crit)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 h-9 rounded-md font-mono text-[12.5px] font-semibold text-black disabled:opacity-50"
            style={{ background: '#fff' }}
          >
            {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup')
              setError(undefined)
            }}
            className="font-mono text-[11.5px] hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </form>
      </div>
    </div>
  )
}
