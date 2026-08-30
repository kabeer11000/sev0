import { useEffect, useRef } from 'react'
import { useSev0Store } from '../store'

export function ContextMenu() {
  const menu = useSev0Store((s) => s.contextMenu)
  const close = useSev0Store((s) => s.closeContextMenu)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onScroll = () => close()
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menu, close])

  if (!menu) return null

  const width = 240
  const height = menu.items.length * 32 + 8
  const x = Math.min(menu.x, window.innerWidth - width - 8)
  const y = Math.min(menu.y, window.innerHeight - height - 8)

  return (
    <div
      ref={ref}
      className="fixed z-[100] flex flex-col rounded-2xl px-1.5 py-1.5"
      style={{
        left: x,
        top: y,
        width,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-pop)',
      }}
    >
      {menu.items.map((item, i) => (
        <span key={i}>
          {item.separatorBefore && <span className="mx-2 my-1 block h-px" style={{ background: 'var(--border)' }} />}
          <button
            disabled={item.disabled}
            onClick={() => {
              item.onClick()
              close()
            }}
            className="flex h-8 w-full items-center rounded-xl px-3 text-left text-[13px] transition-colors disabled:opacity-40"
            style={{ color: item.danger ? 'var(--crit)' : 'var(--fg)' }}
            onMouseEnter={(e) => {
              if (!item.disabled) e.currentTarget.style.background = item.danger ? 'var(--crit-bg)' : 'var(--surface-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {item.label}
          </button>
        </span>
      ))}
    </div>
  )
}
