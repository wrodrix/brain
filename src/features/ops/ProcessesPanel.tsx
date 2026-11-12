import * as React from "react"
import { Activity, AlertTriangle, Lock, Terminal, XCircle } from "lucide-react"
import { toast } from "sonner"

import { StatusBadge } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/primitives"
import { Alert } from "@/components/ui/surface"
import { useDemo } from "@/demo/DemoProvider"
import type { ProcessGroup, Worktree } from "@/demo/types"
import { cn } from "@/lib/utils"

function formatUptime(since: string) {
  const started = new Date(since)
  if (Number.isNaN(started.getTime())) return since
  const minutes = Math.max(0, Math.floor((Date.now() - started.getTime()) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ${minutes % 60} min`
  return `${Math.floor(hours / 24)} d ${hours % 24} h`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[9px] tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="font-mono text-[11px] text-foreground">{value}</span>
    </span>
  )
}

export function ProcessesPanel({
  worktree,
  onNavigateView,
}: {
  worktree: Worktree
  onNavigateView: (view: string) => void
}) {
  const { state, dispatch } = useDemo()
  const processes = state.processes.filter((process) => process.worktreeId === worktree.id)
  const [filter, setFilter] = React.useState<"active" | "alerts" | "ended">("active")
  const [target, setTarget] = React.useState<ProcessGroup | null>(null)
  const [confirmed, setConfirmed] = React.useState(false)
  const offline = state.projects.find((project) => project.id === worktree.projectId)?.environmentState === "offline"

  const visible = processes.filter((process) => {
    if (filter === "alerts") return process.status === "suspicious" || process.status === "unknown"
    if (filter === "ended") return process.status === "ended"
    return process.status !== "ended"
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
        <Activity className="size-4 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Processos do worktree</h2>
          <p className="text-[10px] text-muted-foreground">
            Origem, consumo e ciclo de vida por grupo.
          </p>
        </div>
        <div className="flex rounded-md border p-0.5">
          {[
            { id: "active" as const, label: "Ativos" },
            { id: "alerts" as const, label: "Alertas" },
            { id: "ended" as const, label: "Encerrados" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded px-2 py-1 text-[11px] ${filter === item.id ? "bg-secondary font-medium" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 px-2.5 py-1.5 text-[10px] text-muted-foreground">
          <Activity className="size-3" />
          <span>
            Última medição:{" "}
            {offline ? "desatualizada · ambiente offline" : "11:58 (fictícia, do cenário)"}
          </span>
          <span>· atribuição confirmada ou melhor esforço</span>
        </div>

        {offline && (
          <Alert variant="danger">
            Ambiente offline: a última medição é antiga e ações de encerramento ficam pendentes.
          </Alert>
        )}

        {visible.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum processo neste filtro.
          </div>
        )}

        <ul className="space-y-1.5">
          {visible.map((process) => {
            const ended = process.status === "ended"
            const canEnd =
              process.attribution === "confirmed" && !ended && !offline
            const icon =
              process.kind === "browser" ? (
                <AlertTriangle className="size-3.5" />
              ) : process.kind === "shell" ? (
                <Terminal className="size-3.5" />
              ) : (
                <Activity className="size-3.5" />
              )

            return (
              <li key={process.id} className="rounded-lg border bg-card">
                <div className="flex flex-col gap-1.5 px-3 py-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-md",
                        process.status === "suspicious"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="truncate text-xs font-medium">{process.origin}</span>
                        <StatusBadge kind="process" value={process.status} dot={false} />
                      </div>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {process.reason ?? process.scope}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-9 md:pl-0">
                    <Stat label="CPU" value={process.cpu === null ? "não disponível" : `${process.cpu}%`} />
                    <Stat
                      label="Mem"
                      value={process.memory === null ? "não disponível" : `${process.memory} MiB`}
                    />
                    <Stat label="Tempo" value={ended ? "encerrado" : formatUptime(process.since)} />
                    {canEnd ? (
                      <Button
                        size="xs"
                        variant="outline"
                        className="ml-auto border-red-200 text-red-800 hover:bg-red-50"
                        onClick={() => {
                          setTarget(process)
                          setConfirmed(false)
                        }}
                        aria-label={`Encerrar ${process.origin}`}
                      >
                        <XCircle /> Encerrar
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="ml-auto"
                        disabled
                        title={
                          process.attribution === "best-effort"
                            ? "Origem não comprovada: sem controle exclusivo"
                            : offline
                              ? "Indisponível enquanto o ambiente está offline"
                              : "Recurso já encerrado neste cenário"
                        }
                      >
                        <Lock /> Encerrar
                      </Button>
                    )}
                  </div>
                </div>

                <details className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground/80">
                    Detalhes
                  </summary>
                  <div className="mt-1 grid gap-1">
                    <p className="font-mono break-all">{process.command}</p>
                    <p>
                      escopo: {process.scope} · atribuição: {process.attribution}
                    </p>
                    {process.children && process.children.length > 0 && (
                      <p>filhos: {process.children.join(", ")}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        className="h-5 px-1 text-[10px]"
                        onClick={() => {
                          toast.info("Abrindo os jobs fictícios do worktree.")
                          onNavigateView("jobs")
                        }}
                      >
                        Ver logs do job
                      </Button>
                      <span className="self-center">
                        Métricas ausentes não são zero; encerramento exige confirmação.
                      </span>
                    </div>
                  </div>
                </details>
              </li>
            )
          })}
        </ul>

        {visible.length > 0 && (
          <p className="px-1 text-[10px] text-muted-foreground">
            Trabalhos em background e processos do SO são listas diferentes. Serviços persistentes legítimos
            não são órfãos só porque o agente terminou.
          </p>
        )}
      </div>

      <Dialog
        open={Boolean(target)}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Encerrar recurso?</DialogTitle>
            <DialogDescription>
              Alvo limitado ao grupo deste cenário. Processos dependentes e serviços persistentes
              legítimos são tratados separadamente.
            </DialogDescription>
          </DialogHeader>
          {target && (
            <div className="space-y-2 text-xs">
              <dl className="grid gap-1 rounded border bg-slate-50 p-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Origem</dt>
                  <dd className="font-medium">{target.origin}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Comando</dt>
                  <dd className="truncate font-mono text-[10px]">{target.command}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Escopo</dt>
                  <dd>{target.scope}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Filhos afetados</dt>
                  <dd>{target.children?.join(", ") ?? "nenhum listado"}</dd>
                </div>
              </dl>
              <Alert variant="warning">
                Tentativa cooperativa primeiro. Força pode perder artefatos e exigiria autorização
                efetiva; não é oferecida neste demo.
              </Alert>
              <label className="flex items-start gap-2 rounded border p-2">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                  aria-label="Confirmar encerramento do recurso"
                />
                <span>
                  Confirmo o escopo deste encerramento fictício. Nenhum processo real do host será
                  afetado.
                </span>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!confirmed}
              onClick={() => {
                if (target) dispatch({ type: "END_PROCESS", processId: target.id })
                setTarget(null)
                setConfirmed(false)
                toast.info("Encerramento simulado. O estado aguarda confirmação no cenário.")
              }}
            >
              <XCircle /> Confirmar encerramento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
