import * as React from "react"
import { Bot, Terminal, Workflow } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/surface"
import { useDemo } from "@/demo/DemoProvider"
import { getJobsForWorktree, getSessionsForWorktree } from "@/demo/selectors"
import type { Worktree } from "@/demo/types"
import { JobCard, JobDetailDialog } from "@/features/chat/ChatParts"

export function JobsPanel({
  worktree,
  focusJobId,
}: {
  worktree: Worktree
  focusJobId?: string | null
}) {
  const { state } = useDemo()
  const [filter, setFilter] = React.useState<"all" | "running">("all")
  const [focusedJob, setFocusedJob] = React.useState<string | null>(focusJobId ?? null)
  const jobs = getJobsForWorktree(state, worktree.id)
  const sessions = getSessionsForWorktree(state, worktree.id)
  const visible = filter === "running" ? jobs.filter((job) => job.status === "running") : jobs
  const running = jobs.filter((job) => job.status === "running").length
  const selectedJob = jobs.find((job) => job.id === focusedJob) ?? null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
        <Workflow className="size-4 text-indigo-700" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Trabalho em background</h2>
          <p className="text-[10px] text-muted-foreground">
            Ferramentas e subagentes em background. Trabalhos lógicos não são processos do SO.
          </p>
        </div>
        <div className="flex rounded-md border p-0.5">
          <button
            type="button"
            className={`rounded px-2 py-1 text-[11px] ${filter === "running" ? "bg-secondary font-medium" : ""}`}
            onClick={() => setFilter("running")}
          >
            Executando ({running})
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 text-[11px] ${filter === "all" ? "bg-secondary font-medium" : ""}`}
            onClick={() => setFilter("all")}
          >
            Todos ({jobs.length})
          </button>
        </div>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        <Alert variant="info">
          <div>
            <p className="font-medium">Acompanhamento sem inflar o contexto do pai.</p>
            <p>
              Abrir detalhes ou a sessão filha é somente visual. Status/percentual ausente não vira
              progresso inventado. Cancelamento é “solicitado”, nunca sucesso imediato.
            </p>
          </div>
        </Alert>

        {visible.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum job {filter === "running" ? "em execução" : "neste cenário"}.
          </div>
        )}

        <div className="grid gap-2 lg:grid-cols-2">
          {visible.map((job) => {
            const session = sessions.find((item) => item.id === job.sessionId)
            return (
              <div key={job.id} className="space-y-1">
                <JobCard job={job} sessionTitle={session?.title ?? "sessão não disponível"} />
                <div className="flex flex-wrap items-center gap-1 px-1 text-[10px] text-muted-foreground">
                  {job.kind === "subagent" ? <Bot className="size-3" /> : <Terminal className="size-3" />}
                  <span>escopo do job: {job.id}</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="h-5 px-1 text-[10px]"
                    onClick={() => setFocusedJob(job.id)}
                  >
                    Inspecionar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-lg border bg-card p-3 text-[11px] text-muted-foreground">
          <p className="mb-1 flex items-center gap-1 font-medium text-foreground">
            <Badge variant="outline">escopos distintos</Badge>
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>Interromper agente: encerra a execução da sessão atual.</li>
            <li>Cancelar job: alvo é este job; pode ser apenas solicitado.</li>
            <li>Encerrar processo: alvo é o grupo de processos do worktree, no painel Processos.</li>
            <li>Remover worktree: ação manual separada que preserva o histórico.</li>
          </ul>
        </div>
      </div>

      {selectedJob && (
        <JobDetailDialog
          job={selectedJob}
          open={Boolean(selectedJob)}
          onOpenChange={(open) => {
            if (!open) setFocusedJob(null)
          }}
          sessionTitle={
            sessions.find((item) => item.id === selectedJob.sessionId)?.title ?? "sessão"
          }
        />
      )}
    </div>
  )
}
