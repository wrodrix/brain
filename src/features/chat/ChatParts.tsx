import * as React from "react"
import { Bot, Square, Terminal, Wrench } from "lucide-react"

import { MarkdownView } from "@/components/markdown/MarkdownView"
import { StatusBadge } from "@/components/common/status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert } from "@/components/ui/surface"
import { useDemo } from "@/demo/DemoProvider"
import { getChildSession } from "@/demo/selectors"
import type { Job } from "@/demo/types"
import { formatDateTime } from "@/lib/utils"

export function JobCard({ job, sessionTitle }: { job: Job; sessionTitle: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex size-6 items-center justify-center rounded-md bg-indigo-700 text-white">
          {job.kind === "subagent" ? <Bot className="size-3.5" /> : <Terminal className="size-3.5" />}
        </span>
        <span className="text-xs font-semibold">{job.name}</span>
        <Badge variant={job.kind === "subagent" ? "info" : "secondary"}>
          {job.kind === "subagent" ? "subagente" : "ferramenta"}
        </Badge>
        <StatusBadge kind="job" value={job.status} className="ml-auto" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{job.objective}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">última atividade: {job.lastActivity}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="xs" variant="outline" onClick={() => setOpen(true)}>
          Abrir detalhes
        </Button>
        {job.childSessionId && (
          <Button size="xs" variant="ghost" onClick={() => setOpen(true)}>
            Ver sessão filha
          </Button>
        )}
        <span className="self-center text-[10px] text-muted-foreground">
          sessão de origem: {sessionTitle}
        </span>
      </div>
      <JobDetailDialog job={job} open={open} onOpenChange={setOpen} sessionTitle={sessionTitle} />
    </div>
  )
}

export function JobDetailDialog({
  job,
  open,
  onOpenChange,
  sessionTitle,
}: {
  job: Job
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionTitle: string
}) {
  const { state, dispatch } = useDemo()
  const child = getChildSession(state, job)
  const [showChild, setShowChild] = React.useState(false)
  const [confirmCancel, setConfirmCancel] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="thin-scrollbar max-h-[88dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {job.kind === "subagent" ? <Bot className="size-4" /> : <Terminal className="size-4" />}
            {job.name}
            <StatusBadge kind="job" value={job.status} />
          </DialogTitle>
          <DialogDescription>
            Job {job.kind === "subagent" ? "de subagente" : "de ferramenta"} · origem: {sessionTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-lg border p-2">
            <p className="text-[10px] text-muted-foreground uppercase">Objetivo</p>
            <p>{job.objective}</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-[10px] text-muted-foreground uppercase">Última atividade</p>
            <p>{job.lastActivity}</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-[10px] text-muted-foreground uppercase">Início</p>
            <p>{formatDateTime(job.startedAt)}</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-[10px] text-muted-foreground uppercase">Progresso</p>
            <p className="text-muted-foreground">Percentual não disponível.</p>
          </div>
        </div>

        <div className="rounded-lg border bg-slate-50 p-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Saída curta</p>
          <pre className="mt-1 font-mono text-[11px] whitespace-pre-wrap text-slate-700">{job.output}</pre>
        </div>

        {job.cancellationNote && <Alert variant="warning">{job.cancellationNote}</Alert>}

        <details className="rounded-lg border px-2.5 py-2 text-[11px] text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Sobre esta visualização</summary>
          <p className="mt-1">
            Abrir o detalhe não injeta o transcript no contexto do pai. A sessão filha mantém
            contexto próprio; complementos pertencem à inbox do filho.
          </p>
        </details>

        {child && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowChild((value) => !value)}>
                {showChild ? "Ocultar sessão filha" : "Abrir sessão filha"}
              </Button>
              <span className="text-[11px] text-muted-foreground">visualização separada</span>
            </div>
            {showChild && (
              <div className="mt-2 rounded-lg border">
                <div className="flex items-center gap-2 border-b bg-indigo-50 px-2 py-1.5 text-[11px] text-indigo-900">
                  <Bot className="size-3.5" /> {child.title}
                  <StatusBadge kind="session" value={child.status} className="ml-auto" />
                </div>
                <div className="thin-scrollbar max-h-64 space-y-2 overflow-y-auto p-2">
                  {child.messages.map((message) => (
                    <div key={message.id} className="rounded border bg-card p-2 text-xs">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        {message.role === "tool" ? <Wrench className="size-3" /> : <Bot className="size-3" />}
                        <span className="font-medium">
                          {message.role === "tool" ? message.tool?.name : "Agente (filho)"}
                        </span>
                        <span className="ml-auto">{formatDateTime(message.createdAt)}</span>
                      </div>
                      {message.tool ? (
                        <pre className="mt-1 overflow-auto font-mono text-[10px] whitespace-pre-wrap">
                          {message.tool.output ?? message.tool.args}
                        </pre>
                      ) : (
                        <MarkdownView content={message.content} className="mt-1 text-xs" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            variant="destructive"
            disabled={job.status !== "running"}
            onClick={() => setConfirmCancel(true)}
          >
            <Square /> Pedir cancelamento do job
          </Button>
        </DialogFooter>

        <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Solicitar cancelamento?</DialogTitle>
              <DialogDescription>
                O escopo é somente este job. Cancelar o agente, encerrar processo e remover o
                worktree são ações distintas. O resultado será “solicitado”, não “confirmado”.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmCancel(false)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  dispatch({ type: "CANCEL_JOB", jobId: job.id })
                  setConfirmCancel(false)
                }}
              >
                Solicitar cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
