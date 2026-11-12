import { cn } from "@/lib/utils"
import type { DemoFile } from "@/demo/types"

export function DiffView({ file }: { file: DemoFile }) {
  if (file.diff.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhuma alteração de conteúdo nesta fixture. O arquivo faz parte do worktree, mas não do
        diff atual.
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50 px-3 py-2 text-[11px]">
        <span className="font-medium">Diff unificado</span>
        <span className="text-muted-foreground">{file.path}</span>
        <span className="ml-auto rounded border bg-card px-1.5 py-0.5 font-mono">
          v{file.version} · worktree
        </span>
      </div>
      <div className="thin-scrollbar overflow-x-auto">
        {file.diff.map((hunk, hunkIndex) => (
          <div key={`${hunk.header}-${hunkIndex}`} className="min-w-[520px]">
            <div className="border-y bg-slate-100 px-3 py-1 font-mono text-[11px] text-slate-600">
              {hunk.header}
            </div>
            <div className="font-mono text-[11.5px] leading-relaxed">
              {hunk.lines.map((line, lineIndex) => (
                <div
                  key={`${hunkIndex}-${lineIndex}`}
                  className={cn(
                    "flex gap-2 border-l-2 px-3 py-0.5 whitespace-pre-wrap",
                    line.type === "add" && "border-green-500 bg-green-50 text-green-900",
                    line.type === "remove" && "border-red-400 bg-red-50 text-red-900",
                    line.type === "context" && "border-transparent text-slate-600",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "w-3 shrink-0 select-none text-center",
                      line.type === "add" && "text-green-700",
                      line.type === "remove" && "text-red-700",
                    )}
                  >
                    {line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}
                  </span>
                  <span className="min-w-0">{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
        Diff fictício do worktree. Nenhum comando Git foi executado e o índice real não foi lido.
      </div>
    </div>
  )
}
