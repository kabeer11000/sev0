import type { FsFile } from '../scenario/filesystem'

export interface TreeNode {
  name: string
  path: string
  kind: 'dir' | 'file'
  file?: FsFile
  children?: TreeNode[]
}

export function buildTree(files: FsFile[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', kind: 'dir', children: [] }

  for (const f of files) {
    const parts = f.path.split('/')
    let cursor = root
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      acc = acc ? `${acc}/${part}` : part
      const isLeaf = i === parts.length - 1
      let child = cursor.children!.find((c) => c.name === part)
      if (!child) {
        child = isLeaf
          ? { name: part, path: acc, kind: 'file', file: f }
          : { name: part, path: acc, kind: 'dir', children: [] }
        cursor.children!.push(child)
      }
      cursor = child
    }
  }

  const sortRec = (node: TreeNode) => {
    if (!node.children) return
    node.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    node.children.forEach(sortRec)
  }
  sortRec(root)

  return root.children ?? []
}
