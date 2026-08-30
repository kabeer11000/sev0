import { useState } from 'react'
import { useSession, signOut } from '../authClient'
import { useSev0Store } from '../store'
import { Avatar } from './Avatar'
import { AuthModal } from './AuthModal'
import { navigate } from '../router'

export function AccountMenu() {
  const { data, isPending } = useSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const setTutorialOpen = useSev0Store((s) => s.setTutorialOpen)
  const setCommandPaletteOpen = useSev0Store((s) => s.setCommandPaletteOpen)
  const restartIncident = useSev0Store((s) => s.restartIncident)

  if (isPending) return <span className="h-8 w-16" />

  if (!data?.user) {
    return (
      <>
        <button
          onClick={() => setAuthOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
          style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)', background: 'var(--surface)' }}
        >
          Sign in
        </button>
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      </>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-8 items-center gap-2 rounded-full px-1.5 pr-2.5 transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <Avatar name={data.user.name || data.user.email} />
        <span className="max-w-[110px] truncate text-[12.5px] font-medium" style={{ color: 'var(--fg-muted)' }}>
          {data.user.name || data.user.email}
        </span>
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute right-0 top-10 z-50 flex w-52 flex-col overflow-hidden rounded-2xl py-1.5"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)', boxShadow: '0 12px 32px rgba(43, 36, 28, 0.14)' }}
          >
            <button
              onClick={() => {
                setMenuOpen(false)
                setCommandPaletteOpen(true)
              }}
              className="mx-1 flex items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--fg-muted)' }}
            >
              <span>Search &amp; commands</span>
              <span
                className="rounded-full px-1.5 font-mono text-[10px]"
                style={{ background: 'var(--surface)', color: 'var(--fg-faint)', border: '1px solid var(--border)' }}
              >
                ⌘K
              </span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                setTutorialOpen(true)
              }}
              className="mx-1 rounded-xl px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--fg-muted)' }}
            >
              How this works
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                navigate('/leaderboard')
              }}
              className="mx-1 rounded-xl px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--fg-muted)' }}
            >
              Leaderboard
            </button>
            <div className="my-1 mx-2 border-t" style={{ borderColor: 'var(--border)' }} />
            <button
              onClick={() => {
                setMenuOpen(false)
                restartIncident()
              }}
              className="mx-1 rounded-xl px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--fg-muted)' }}
            >
              Restart this incident
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                signOut()
              }}
              className="mx-1 rounded-xl px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--crit-bg)]"
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
