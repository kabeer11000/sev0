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
      style={{ background: 'rgba(43, 36, 28, 0.35)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] rounded-3xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <span className="text-[16px] font-semibold" style={{ color: 'var(--fg)' }}>
            {mode === 'signup' ? 'Create an account' : 'Sign in'}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full px-2.5 py-0.5 text-[11px] transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--fg-faint)' }}
          >
            close
          </button>
        </div>
        <p className="px-6 pb-1 pt-2 text-[13px] leading-relaxed" style={{ color: 'var(--fg-faint)' }}>
          Only used to save your resolved incidents to the leaderboard and sync progress. No verification email, nothing
          fancy.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3 px-6 pb-6 pt-4">
          {mode === 'signup' && (
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              className="h-10 rounded-full border px-4 text-[13.5px] outline-none transition-colors focus:border-[var(--accent)]"
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
            className="h-10 rounded-full border px-4 text-[13.5px] outline-none transition-colors focus:border-[var(--accent)]"
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
            className="h-10 rounded-full border px-4 text-[13.5px] outline-none transition-colors focus:border-[var(--accent)]"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)', color: 'var(--fg)' }}
          />

          {error && (
            <div className="rounded-2xl px-3 py-2 text-[12.5px]" style={{ background: 'var(--crit-bg)', color: 'var(--crit)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 h-10 rounded-full text-[13.5px] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
            style={{
              background: 'linear-gradient(180deg, #f37c5a 0%, var(--accent) 60%, var(--accent-strong) 100%)',
              boxShadow: '0 3px 10px rgba(238, 90, 54, 0.28)',
            }}
          >
            {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup')
              setError(undefined)
            }}
            className="text-[12.5px] hover:underline"
            style={{ color: 'var(--accent-strong)' }}
          >
            {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </form>
      </div>
    </div>
  )
}
