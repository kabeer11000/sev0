import { useState } from 'react'
import { useSev0Store } from '../store'
import { buildTree } from './treeBuilder'
import type { TreeNode } from './treeBuilder'

const EXT_COLOR: Record<string, string> = {
  ts: '#5b9bd5',
  tsx: '#5b9bd5',
  json: '#e0c168',
  yaml: '#8ec07c',
  md: 'var(--fg-faint)',
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
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] font-mono text-[7px] font-bold"
      style={{ background: color, color: '#000', opacity: 0.85 }}
    >
      {ext.slice(0, 2).toUpperCase() || '·'}
    </span>
  )
}

function Row({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(true)
  const activeTabId = useSev0Store((s) => s.activeCenterTabId)
  const openFile = useSev0Store((s) => s.openFile)
  const resetFile = useSev0Store((s) => s.resetFile)
  const openContextMenu = useSev0Store((s) => s.openContextMenu)

  const pad = 10 + depth * 14

  if (node.kind === 'dir') {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-1.5 py-[3px] text-left font-mono text-[11.5px]"
          style={{ paddingLeft: pad, color: 'var(--fg-muted)' }}
        >
          <span className="inline-block w-2.5 shrink-0 text-[9px]" style={{ color: 'var(--fg-faint)' }}>
            {open ? '▾' : '▸'}
          </span>
          {node.name}
        </button>
        {open && node.children?.map((c) => <Row key={c.path} node={c} depth={depth + 1} />)}
      </div>
    )
  }

  const file = node.file!
  const isActive = activeTabId === `file:${file.path}`

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
      className="flex w-full items-center gap-1.5 py-[3px] text-left font-mono text-[11.5px] transition-colors"
      style={{
        paddingLeft: pad + 12,
        color: isActive ? 'var(--fg)' : file.editable ? 'var(--fg-muted)' : 'var(--fg-faint)',
        background: isActive ? 'var(--surface-hover)' : 'transparent',
      }}
    >
      <FileIcon name={node.name} />
      <span className="truncate">{node.name}</span>
      {file.editable && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} title="editable" />
      )}
    </button>
  )
}

export function FileTree() {
  const filesystem = useSev0Store((s) => s.filesystem)
  const tree = buildTree(filesystem)

  return (
    <div className="flex h-full flex-col overflow-y-auto py-1.5">
      {tree.map((n) => (
        <Row key={n.path} node={n} depth={0} />
      ))}
    </div>
  )
}
