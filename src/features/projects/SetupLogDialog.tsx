import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/common/status"
import type { Worktree } from "@/demo/types"
import { formatDateTime } from "@/lib/utils"

export function SetupLogDialog({
  worktree,
  open,
  onOpenChange,
}: {
  worktree: Worktree | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!worktree) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Setup · {worktree.name}</DialogTitle>
          <DialogDescription>
            Saída fictícia do setup. Nenhum comando foi executado neste demo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 text-xs">
          <StatusBadge kind="worktree" value={worktree.status} />
          <span className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-[11px]">
            exit code: {worktree.setup.exitCode ?? "ainda não disponível"}
          </span>
          <span className="text-muted-foreground">iniciado em {formatDateTime(worktree.setup.startedAt)}</span>
        </div>
        <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
          {worktree.setup.output.join("\n")}
        </pre>
        <p className="text-[11px] text-muted-foreground">
          Falha de setup não libera a sessão como pronta. Repetir o setup é uma ação explícita e não
          acontece automaticamente ao reabrir a tela.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            variant="secondary"
            disabled={worktree.setup.state !== "failed"}
            title="Repetição real de setup pertence a um marco posterior"
          >
            Repetir setup (indisponível)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SetupInline({
  worktree,
  onOpenLog,
}: {
  worktree: Worktree
  onOpenLog: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <StatusBadge kind="worktree" value={worktree.status} />
      <span className="text-muted-foreground">
        setup:{" "}
        {worktree.setup.state === "succeeded"
          ? "concluído"
          : worktree.setup.state === "failed"
            ? `falhou (exit ${worktree.setup.exitCode ?? "?"})`
            : worktree.setup.state}
      </span>
      <Button size="xs" variant="ghost" onClick={onOpenLog}>
        Ver logs do setup
      </Button>
    </div>
  )
}
