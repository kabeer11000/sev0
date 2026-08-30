import { useEffect } from 'react'
import { useSev0Store } from '../store'

export function Toast() {
  const toast = useSev0Store((s) => s.toast)
  const clearToast = useSev0Store((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => clearToast(), 2400)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center">
      <div
        className="rounded-md px-3.5 py-2 font-mono text-[12px] shadow-lg"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
      >
        {toast}
      </div>
    </div>
  )
}
