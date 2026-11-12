import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  History,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

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
import { Checkbox } from "@/components/ui/primitives"
import { Alert, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surface"
import { useDemo } from "@/demo/DemoProvider"
import type { Project, Worktree } from "@/demo/types"
import { formatDateTime } from "@/lib/utils"

const commits = [
  { sha: "a1b2c3d", message: "fix(auth): preservar destino após login", author: "Agente build" },
  { sha: "f9e8d7c", message: "test(auth): cobrir retorno à rota original", author: "Agente build" },
]

export function ReviewPanel({
  project,
  worktree,
  onNavigateView,
}: {
  project: Project
  worktree: Worktree
  onNavigateView: (view: string) => void
}) {
  const { state, dispatch, advance } = useDemo()
  const navigate = useNavigate()
  const pr = state.prs.find((item) => item.worktreeId === worktree.id) ?? null
  const [method, setMethod] = React.useState<"merge" | "squash">(
    pr?.mergeMethods[0] ?? "squash",
  )
  const [removeOpen, setRemoveOpen] = React.useState(false)
  const [removeConfirmed, setRemoveConfirmed] = React.useState(false)
  const gates = pr?.gates ?? []
  const stale = Boolean(pr && pr.reviewedSha !== pr.sha)
  const failedRequired = gates.filter((gate) => gate.required && gate.status !== "passed")
  const hasRunningRequired = failedRequired.some((gate) => gate.status === "running")
  const unavailable = pr?.gatesState === "unavailable" || pr?.state === "unavailable"
  const merged = pr?.mergeState === "merged" || pr?.state === "merged"
  const queued = pr?.mergeState === "queued"
  const mergeDisabled = !pr || merged || queued || stale || unavailable || failedRequired.length > 0
  const mergeReason = !pr
    ? "Nenhuma PR nesta fixture."
    : merged
      ? "Integração já confirmada neste cenário."
      : queued
        ? "Merge solicitado e em fila; ainda não é integração confirmada."
        : unavailable
          ? "Consulta de gates/PR indisponível. Não é possível confirmar mergeabilidade."
          : stale
            ? "Evidência desatualizada em relação ao SHA atual."
            : failedRequired.length > 0
              ? hasRunningRequired
                ? "Gates obrigatórios ainda em execução."
                : "Há gate obrigatório que não passou."
              : null

  function confirmMerge() {
    if (!pr || mergeDisabled) return
    dispatch({ type: "MERGE_PR", prId: pr.id, method })
    toast.info("Merge solicitado e colocado em fila.", {
      description: "Ainda não é integração confirmada. Avance a simulação para observar o resultado.",
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
        <GitPullRequest className="size-4 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Revisão e integração</h2>
          <p className="text-[10px] text-muted-foreground">
            Evidências pertencem ao SHA apresentado. Nenhuma operação Git ou GitHub é real.
          </p>
        </div>
        <Button size="xs" variant="ghost" onClick={() => onNavigateView("chat")}>
          <ArrowLeft /> Conversa
        </Button>
        <Button size="xs" variant="outline" onClick={() => onNavigateView("files")}>
          Ver diff completo
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled
          title="Evidências reais pertencem ao M3/M5"
        >
          Ver evidências
        </Button>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {!pr && (
          <Card>
            <CardHeader>
              <CardTitle>Rito local + push</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p>
                Este worktree usa <strong>{project.integrationRite === "local-push" ? "local + push" : "PR"}</strong>{" "}
                conforme o projeto. Não há PR nesta fixture.
              </p>
              <ol className="flex flex-wrap gap-1.5 text-[11px]">
                {["worktree", "integração local", "push pendente", "remoto confirmado"].map(
                  (step, index) => (
                    <li key={step} className="flex items-center gap-1">
                      <Badge variant={index === 0 ? "success" : "outline"}>{step}</Badge>
                      {index < 3 && <span className="text-muted-foreground">→</span>}
                    </li>
                  ),
                )}
              </ol>
              <Alert variant="warning">
                Integração local e push reais pertencem ao M3/M5. Nenhum comando é executado e o
                push não é simulado como concluído.
              </Alert>
              <Button size="sm" variant="outline" disabled title="Integração real fora do M1">
                Fazer merge local (indisponível)
              </Button>
            </CardContent>
          </Card>
        )}

        {pr && (
          <>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <GitPullRequest className="size-4" /> PR #{pr.number} · {pr.title}
                  <StatusBadge kind="merge" value={pr.mergeState} className="ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1.5 text-xs sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Repo:</span> {project.repo}
                </p>
                <p>
                  <span className="text-muted-foreground">Head → base:</span> {pr.head} → {pr.base}
                </p>
                <p>
                  <span className="text-muted-foreground">SHA atual:</span>{" "}
                  <code className="rounded bg-secondary px-1 font-mono">{pr.sha}</code>
                </p>
                <p>
                  <span className="text-muted-foreground">SHA revisado:</span>{" "}
                  <code className="rounded bg-secondary px-1 font-mono">{pr.reviewedSha}</code>
                </p>
                <p>
                  <span className="text-muted-foreground">Atualizado:</span>{" "}
                  {formatDateTime(pr.updatedAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Métodos:</span>{" "}
                  {pr.mergeMethods.join(", ")}
                </p>
              </CardContent>
            </Card>

            {stale && (
              <Alert variant="danger">
                <div className="flex-1">
                  <p className="flex items-center gap-1 font-medium">
                    <AlertTriangle className="size-3.5" /> Evidência desatualizada
                  </p>
                  <p>
                    O código mudou depois da revisão. O merge não pode reutilizar o pass do SHA
                    anterior. Revalide a evidência antes de integrar.
                  </p>
                  <Button
                    size="xs"
                    className="mt-1.5"
                    variant="outline"
                    onClick={() => dispatch({ type: "REVALIDATE_REVIEW", prId: pr.id })}
                  >
                    <RefreshCw /> Revalidar evidência no SHA atual
                  </Button>
                </div>
              </Alert>
            )}

            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-2 text-sm">
                  Gates e checks
                  {pr.gatesState === "reported" && <Badge variant="secondary">{gates.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3 pt-1">
                {pr.gatesState === "unavailable" && (
                  <Alert variant="warning">
                    <div>
                      <p className="font-medium">Não foi possível consultar os gates.</p>
                      <p>
                        Isto é diferente de “nenhum reportado”. O merge permanece indisponível até
                        uma leitura válida.
                      </p>
                    </div>
                  </Alert>
                )}
                {pr.gatesState === "none" && (
                  <Alert variant="info">
                    Nenhum gate reportado (conhecido). O repositório não exige checks nesta fixture;
                    isso não significa que todos passaram.
                  </Alert>
                )}
                {pr.gatesState === "reported" &&
                  gates.map((gate) => (
                    <div key={gate.id} className="rounded-lg border p-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge kind="gate" value={gate.status} />
                        <span className="text-xs font-medium">{gate.name}</span>
                        {gate.required ? (
                          <Badge variant="outline">obrigatório</Badge>
                        ) : (
                          <Badge variant="muted">opcional</Badge>
                        )}
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                          SHA {gate.sha}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{gate.detail}</p>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] font-medium text-primary">
                          Detalhes e fonte
                        </summary>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          fonte: {gate.source} · vínculo: {gate.sha}
                        </p>
                      </details>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {pr.note && <Alert variant={merged ? "success" : queued ? "warning" : "info"}>{pr.note}</Alert>}

            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <GitMerge className="size-4" /> Integração
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-1">
                <p className="text-xs">
                  Rito do projeto:{" "}
                  <strong>{project.integrationRite === "pr" ? "PR" : "Local + push"}</strong> ·
                  identidade de publicação: Você (fictícia)
                </p>
                <fieldset className="flex flex-wrap gap-3 text-xs">
                  <legend className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Método de merge
                  </legend>
                  {(["merge", "squash"] as const).map((option) => {
                    const allowed = pr.mergeMethods.includes(option)
                    return (
                      <label
                        key={option}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${
                          allowed ? "cursor-pointer" : "opacity-50"
                        }`}
                        title={allowed ? undefined : "Método não permitido nesta fixture"}
                      >
                        <input
                          type="radio"
                          name="merge-method"
                          value={option}
                          checked={method === option}
                          disabled={!allowed}
                          onChange={() => setMethod(option)}
                        />
                        {option === "merge" ? "Merge commit" : "Squash merge"}
                        {!allowed && <span className="text-[10px]">(não permitido)</span>}
                      </label>
                    )
                  })}
                </fieldset>
                {mergeReason && !merged && (
                  <p className="flex items-start gap-1 text-[11px] text-amber-800">
                    <ShieldAlert className="mt-0.5 size-3.5 shrink-0" /> {mergeReason}
                  </p>
                )}
                {queued && (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-warning-soft p-2 text-[11px] text-amber-900">
                    <span>
                      Solicitação em fila. O merge ainda não foi integrado. Avance a simulação para
                      observar a confirmação.
                    </span>
                    <Button size="xs" onClick={advance}>
                      Avançar simulação
                    </Button>
                  </div>
                )}
                {merged && (
                  <Alert variant="success">
                    <div>
                      <p className="flex items-center gap-1 font-medium">
                        <CheckCircle2 className="size-3.5" /> Integração confirmada no cenário.
                      </p>
                      <p>
                        O worktree permanece disponível. Histórico, sessões e evidências foram
                        preservados. Nenhum remoto real foi alterado.
                      </p>
                    </div>
                  </Alert>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={confirmMerge}
                    disabled={Boolean(mergeDisabled)}
                    title={mergeReason ?? "Solicitar merge simulado"}
                  >
                    <GitMerge /> {queued ? "Merge em fila" : merged ? "Integrado" : "Fazer merge..."}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigateView("files")}
                  >
                    Revisar diff
                  </Button>
                  {merged && (
                    <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${project.id}`)}>
                      Continuar no worktree
                    </Button>
                  )}
                </div>
                {!merged && !queued && (
                  <p className="flex items-start gap-1 text-[10px] text-muted-foreground">
                    <CircleSlash className="mt-0.5 size-3 shrink-0" />
                    Solicitar merge não altera regras do remoto, não ignora gates obrigatórios e não
                    declara integração antes da confirmação.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <GitCommitHorizontal className="size-4" /> Commits do agente (fictícios)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <ul className="space-y-1">
                  {commits.map((commit) => (
                    <li key={commit.sha} className="flex flex-wrap items-center gap-2 rounded border p-1.5 text-[11px]">
                      <code className="rounded bg-secondary px-1 font-mono">{commit.sha}</code>
                      <span className="min-w-0 flex-1">{commit.message}</span>
                      <span className="text-muted-foreground">{commit.author}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Commits são feitos pelo agente no fluxo real; o card manual de staging não pertence
                  ao M1. Commit não concede push ou merge.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="border-red-200">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm text-red-800">
              <Trash2 className="size-4" /> Remoção do worktree
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-1 text-xs">
            <p>
              Integrar não remove o checkout. A remoção é manual, exige confirmação própria e
              preserva sessões, evidências e anexos.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-800 hover:bg-red-50"
              onClick={() => setRemoveOpen(true)}
              disabled={worktree.status === "removed"}
            >
              <Trash2 /> {worktree.status === "removed" ? "Checkout já removido" : "Remover worktree…"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 p-2 text-[10px] text-muted-foreground">
          <History className="size-3.5" />
          <span>Estado do cenário: evento {state.ui.sim.tick}/{state.ui.sim.totalTicks}</span>
          <Button size="xs" variant="ghost" className="h-6 px-1 text-[10px]" onClick={advance}>
            Avançar evento
          </Button>
        </div>
      </div>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Remover worktree — confirmação separada</DialogTitle>
            <DialogDescription>
              Esta confirmação não apaga sessões, evidências ou anexos. A branch é mantida e a
              exclusão dela seria outra ação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            <dl className="grid gap-1 rounded-md border bg-slate-50 p-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Alvo</dt>
                <dd className="font-medium">
                  {project.name} / {worktree.name}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Path</dt>
                <dd className="truncate font-mono text-[10px]">{worktree.path}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Branch</dt>
                <dd className="font-mono">{worktree.branch} · manter</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Serão encerrados no cenário</dt>
                <dd>jobs, terminais e previews gerenciados</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Histórico</dt>
                <dd>preservado (sem checkbox para apagar)</dd>
              </div>
            </dl>
            {!merged && (
              <Alert variant="warning">
                O checkout não está integrado neste cenário. Remover exige decisão explícita sobre o
                trabalho não integrado; nada é apagado do host real.
              </Alert>
            )}
            <label className="flex items-start gap-2 rounded-md border p-2">
              <Checkbox
                checked={removeConfirmed}
                onCheckedChange={(checked) => setRemoveConfirmed(checked === true)}
                aria-label="Confirmar remoção fictícia"
              />
              <span>
                Entendo que a remoção é simulada, que o worktree sai da árvore ativa e que o
                histórico continua acessível na busca.
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!removeConfirmed}
              onClick={() => {
                dispatch({ type: "REMOVE_WORKTREE", worktreeId: worktree.id })
                setRemoveOpen(false)
                setRemoveConfirmed(false)
                toast.info("Worktree removido do cenário. Sessões e evidências foram preservadas.")
              }}
            >
              <Trash2 /> Confirmar remoção (fictícia)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
