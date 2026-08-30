import { useState } from 'react'
import { useSession, signOut } from '../authClient'
import { Avatar } from './Avatar'
import { AuthModal } from './AuthModal'
import { navigate } from '../router'

export function AccountMenu() {
  const { data, isPending } = useSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  if (isPending) return <span className="h-6 w-14" />

  if (!data?.user) {
    return (
      <>
        <button
          onClick={() => setAuthOpen(true)}
          className="flex h-6 items-center gap-1.5 rounded px-2 font-mono text-[10.5px]"
          style={{ border: '1px solid var(--border-strong)', color: 'var(--fg-muted)', background: 'var(--surface)' }}
        >
          Sign in
        </button>
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      </>
    )
  }

  return (
    <div className="relative">
      <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-[var(--surface-hover)]">
        <Avatar name={data.user.name || data.user.email} />
        <span className="max-w-[110px] truncate font-mono text-[11px]" style={{ color: 'var(--fg-muted)' }}>
          {data.user.name || data.user.email}
        </span>
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute right-0 top-8 z-50 flex w-40 flex-col overflow-hidden rounded-md border py-1"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-elevated)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}
          >
            <button
              onClick={() => {
                setMenuOpen(false)
                navigate('/leaderboard')
              }}
              className="px-3 py-1.5 text-left font-mono text-[11.5px] hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--fg-muted)' }}
            >
              Leaderboard
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                signOut()
              }}
              className="px-3 py-1.5 text-left font-mono text-[11.5px] hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--crit)' }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
