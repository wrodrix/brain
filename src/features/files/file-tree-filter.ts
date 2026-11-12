import type { TreeNode } from "@/demo/selectors"

export function filterFileTree(nodes: TreeNode[], query: string): TreeNode[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return nodes
  return nodes.flatMap((node) => {
    if (node.file) {
      return node.path.toLowerCase().includes(normalized) ? [node] : []
    }
    const children = filterFileTree(node.children, normalized)
    return children.length > 0 ? [{ ...node, children }] : []
  })
}
