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

  const width = 210
  const height = menu.items.length * 30 + 8
  const x = Math.min(menu.x, window.innerWidth - width - 8)
  const y = Math.min(menu.y, window.innerHeight - height - 8)

  return (
    <div
      ref={ref}
      className="fixed z-[100] flex flex-col rounded-md py-1"
      style={{
        left: x,
        top: y,
        width,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
      }}
    >
      {menu.items.map((item, i) => (
        <span key={i}>
          {item.separatorBefore && <span className="my-1 block h-px" style={{ background: 'var(--border)' }} />}
          <button
            disabled={item.disabled}
            onClick={() => {
              item.onClick()
              close()
            }}
            className="flex h-[26px] w-full items-center px-3 text-left font-mono text-[11.5px] disabled:opacity-40"
            style={{ color: item.danger ? 'var(--crit)' : 'var(--fg)' }}
            onMouseEnter={(e) => {
              if (!item.disabled) e.currentTarget.style.background = 'var(--surface-hover)'
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
