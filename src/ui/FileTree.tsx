import { useState } from 'react'
import { useSev0Store } from '../store'
import { buildTree } from './treeBuilder'
import type { TreeNode } from './treeBuilder'

const EXT_COLOR: Record<string, string> = {
  ts: '#5b9bd5',
  tsx: '#5b9bd5',
  js: '#e0c168',
  json: '#e0c168',
  yaml: '#8ec07c',
  yml: '#8ec07c',
  md: '#a89684',
  sql: '#d4a574',
  sh: '#7dacb8',
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i + 1)
}

function FileIcon({ name }: { name: string }) {
  const ext = extOf(name)
  const color = EXT_COLOR[ext] ?? 'var(--fg-faint)'
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md font-mono text-[8px] font-bold"
      style={{ background: color, color: '#000', opacity: 0.9 }}
    >
      {ext.slice(0, 2).toUpperCase() || '·'}
    </span>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      style={{
        transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
        transition: 'transform 180ms ease',
      }}
      aria-hidden
    >
      <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 10 L2 8 L8 2 L10 4 L4 10 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function Row({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(true)
  const [hover, setHover] = useState(false)
  const activeTabId = useSev0Store((s) => s.activeCenterTabId)
  const openFile = useSev0Store((s) => s.openFile)
  const resetFile = useSev0Store((s) => s.resetFile)
  const openContextMenu = useSev0Store((s) => s.openContextMenu)

  const pad = 8 + depth * 12

  if (node.kind === 'dir') {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className="flex w-full items-center gap-1 rounded-lg py-1 pr-2 text-left font-medium transition-colors duration-150"
          style={{
            paddingLeft: pad,
            color: 'var(--fg-muted)',
            background: hover ? 'var(--surface-hover)' : 'transparent',
          }}
        >
          <ChevronIcon open={open} />
          <span className="text-[12px]">{node.name}</span>
        </button>
        {open && node.children?.map((c) => <Row key={c.path} node={c} depth={depth + 1} />)}
      </div>
    )
  }

  const file = node.file!
  const isActive = activeTabId === `file:${file.path}`
  const [fileHover, setFileHover] = useState(false)

  return (
    <button
      onClick={() => openFile(file.path)}
      onContextMenu={(e) => {
        e.preventDefault()
        openContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            { label: 'Open', onClick: () => openFile(file.path) },
            ...(file.editable
              ? [{ label: 'Reset to starter', onClick: () => resetFile(file.path), separatorBefore: true }]
              : []),
            { label: 'Copy path', onClick: () => navigator.clipboard?.writeText(file.path), separatorBefore: !file.editable },
          ],
        })
      }}
      onMouseEnter={() => setFileHover(true)}
      onMouseLeave={() => setFileHover(false)}
      className="group flex w-full items-center gap-2 rounded-lg py-1 pr-2 text-left transition-all duration-150"
      style={{
        paddingLeft: pad + 8,
        color: isActive ? 'var(--fg)' : file.editable ? 'var(--fg-muted)' : 'var(--fg-faint)',
        background: isActive
          ? 'linear-gradient(90deg, var(--accent-dim) 0%, transparent 100%)'
          : fileHover
            ? 'var(--surface-hover)'
            : 'transparent',
        transform: fileHover && !isActive ? 'translateX(2px)' : 'translateX(0)',
      }}
    >
      <FileIcon name={node.name} />
      <span className="truncate text-[12px]">{node.name}</span>
      {file.editable && (
        <span
          className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          style={{
            background: isActive ? 'var(--accent)' : 'var(--accent-dim)',
            color: isActive ? '#fff' : 'var(--accent-strong)',
          }}
          title="Editable"
        >
          <PencilIcon />
        </span>
      )}
      {isActive && (
        <span
          className="absolute right-2 h-1.5 w-1.5 rounded-full"
          style={{ background: 'var(--accent)' }}
          aria-hidden
        />
      )}
    </button>
  )
}

export function FileTree() {
  const filesystem = useSev0Store((s) => s.filesystem)
  const tree = buildTree(filesystem)

  return (
    <div className="flex h-full flex-col overflow-y-auto px-2 py-2">
      {tree.map((n) => (
        <Row key={n.path} node={n} depth={0} />
      ))}
    </div>
  )
}