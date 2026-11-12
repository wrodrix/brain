import { AlertTriangle, FileCode2, FileText, Folder } from "lucide-react"

import type { DemoFile } from "@/demo/types"
import type { TreeNode } from "@/demo/selectors"
import { cn } from "@/lib/utils"

function statusLabel(file: DemoFile) {
  if (file.status === "modified") return "M"
  if (file.status === "added") return "A"
  return ""
}

export function FileTree({
  nodes,
  depth = 0,
  selectedId,
  onSelect,
}: {
  nodes: TreeNode[]
  depth?: number
  selectedId: string | null
  onSelect: (file: DemoFile) => void
}) {
  return (
    <ul role={depth === 0 ? "tree" : "group"} className="space-y-0.5">
      {nodes.map((node) => (
        <li key={node.path} role="treeitem" aria-expanded={node.file ? undefined : true}>
          {node.file ? (
            <button
              type="button"
              onClick={() => node.file && onSelect(node.file)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selectedId === node.file.id && "bg-accent text-accent-foreground",
              )}
              style={{ paddingLeft: `${4 + depth * 10}px` }}
              title={node.file.path}
            >
              {node.file.path.endsWith(".md") ? (
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate font-mono">{node.name}</span>
              {node.file.unavailable && <AlertTriangle className="size-3 text-amber-600" />}
              {statusLabel(node.file) && (
                <span
                  className={cn(
                    "font-mono text-[10px] font-bold",
                    node.file.status === "added" ? "text-green-700" : "text-amber-700",
                  )}
                >
                  {statusLabel(node.file)}
                </span>
              )}
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs font-medium text-slate-600"
              style={{ paddingLeft: `${4 + depth * 10}px` }}
            >
              <Folder className="size-3.5 shrink-0 text-slate-400" />
              {node.name}
            </div>
          )}
          {node.children.length > 0 && (
            <FileTree
              nodes={node.children}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          )}
        </li>
      ))}
    </ul>
  )
}
