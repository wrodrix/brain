import * as React from "react"
import { useLocation } from "react-router-dom"
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  MessageSquare,
  Pencil,
  Send,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { MarkdownView } from "@/components/markdown/MarkdownView"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/dialog"
import { Input, Label, Textarea } from "@/components/ui/form"
import { Alert } from "@/components/ui/surface"
import { useDemo } from "@/demo/DemoProvider"
import { getActiveSession, getIssue, getProject, getWorktree } from "@/demo/selectors"
import { formatDateTime } from "@/lib/utils"
import type { Issue } from "@/demo/types"

export function IssueOverlay() {
  const { state, dispatch } = useDemo()
  const location = useLocation()
  const overlay = state.ui.issueOverlay
  const open = overlay.open
  const currentIssue = overlay.issueId ? getIssue(state, overlay.issueId) : null
  const [listQuery, setListQuery] = React.useState("")
  const [listFilter, setListFilter] = React.useState<"all" | "open" | "closed">("all")
  const [prepareOpen, setPrepareOpen] = React.useState(false)
  const [prepareResult, setPrepareResult] = React.useState<string | null>(null)
  const [compareOpen, setCompareOpen] = React.useState(false)
  const [editDrafts, setEditDrafts] = React.useState<
    Record<string, { title: string; body: string }>
  >({})
  const returnFocusRef = React.useRef<HTMLElement | null>(null)

  const projectId = currentIssue?.projectId ?? state.projects[0]?.id ?? "atlas"
  const project = getProject(state, projectId)
  const projectIssues = state.issues.filter(
    (issue) =>
      issue.projectId === projectId &&
      (listFilter === "all" || issue.state === listFilter) &&
      `${issue.number} ${issue.title} ${issue.labels.join(" ")}`
        .toLowerCase()
        .includes(listQuery.toLowerCase()),
  )

  const worktreeForIssue = currentIssue
    ? state.worktrees.find((worktree) => worktree.issueId === currentIssue.id)
    : null
  const worktreeMatch = /\/projects\/[^/]+\/worktrees\/([^/?]+)/.exec(location.pathname)
  const currentWorktree = getWorktree(state, worktreeMatch?.[1] ?? null)
  const targetSession = currentWorktree ? getActiveSession(state, currentWorktree.id) : null

  function selectIssue(issueId: string) {
    dispatch({ type: "OPEN_ISSUE", issueId, triggerLabel: overlay.triggerLabel ?? "Lista de issues" })
  }

  function addIssueToPrompt(issue: Issue) {
    const session = targetSession ?? getActiveSession(state, "wt-login")
    if (!session) return
    dispatch({
      type: "ADD_SOURCE",
      sessionId: session.id,
      source: {
        id: `src-issue-${issue.id}`,
        kind: "issue",
        label: `${issue.repo}#${issue.number}`,
        detail: `${issue.title} · ${issue.state === "open" ? "aberta" : "encerrada"}`,
        repo: issue.repo,
        issueNumber: issue.number,
        provenance: `Descrição + ${issue.comments.length}/${issue.comments.length} comentários carregados`,
        content: issue.body,
      },
    })
    toast.success(`Issue ${issue.repo}#${issue.number} adicionada ao rascunho de ${session.title}.`, {
      description: "Mencionar prepara o contexto do prompt; não publica nem altera a issue.",
    })
  }

  const draft = currentIssue ? (state.ui.issueCommentDrafts[currentIssue.id] ?? "") : ""
  const editDraft = currentIssue
    ? (editDrafts[currentIssue.id] ?? { title: currentIssue.title, body: currentIssue.body })
    : null

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) dispatch({ type: "CLOSE_ISSUE" })
        }}
      >
        <SheetContent
          aria-describedby={undefined}
          className="gap-0 p-0"
          onEscapeKeyDown={() => dispatch({ type: "CLOSE_ISSUE" })}
          onOpenAutoFocus={() => {
            if (document.activeElement instanceof HTMLElement) {
              returnFocusRef.current = document.activeElement
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocusRef.current?.focus()
          }}
        >
          <div className="flex items-center gap-2 border-b bg-slate-50/80 px-3 py-2.5">
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => dispatch({ type: "SET_ISSUE_MOBILE_VIEW", view: "list" })}
              aria-label="Voltar para a lista de issues"
            >
              <ArrowLeft />
            </Button>
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex items-center gap-2 text-sm">
                <span>Issues</span>
                <Badge variant="outline">overlay global · demo</Badge>
              </SheetTitle>
              <SheetDescription>
                {project?.repo ?? "projeto"} · dados fictícios · sem escrita no GitHub
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => toast.info("Expandir é apenas uma representação neste demo.")}
            >
              Expandir
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fechar painel de issues">
                <X />
              </Button>
            </DialogClose>
          </div>

          <div className="grid min-h-0 flex-1 md:grid-cols-[300px_minmax(0,1fr)]">
            <aside
              className={`thin-scrollbar min-h-0 flex-col overflow-y-auto border-r bg-slate-50/50 p-3 md:flex ${
                overlay.mobileView === "list" ? "flex" : "hidden"
              }`}
              aria-label="Lista de issues"
            >
              <select
                aria-label="Projeto das issues"
                className="mb-2 h-8 w-full rounded-md border border-input bg-card px-2 text-xs"
                value={projectId}
                onChange={(event) => {
                  const nextProjectId = event.target.value
                  const firstIssue = state.issues.find((issue) => issue.projectId === nextProjectId)
                  if (firstIssue) {
                    dispatch({
                      type: "OPEN_ISSUE",
                      issueId: firstIssue.id,
                      triggerLabel: overlay.triggerLabel ?? "Lista de issues",
                    })
                  }
                }}
              >
                {state.projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.repo}
                  </option>
                ))}
              </select>
              <div className="flex gap-1.5">
                <Input
                  value={listQuery}
                  onChange={(event) => setListQuery(event.target.value)}
                  placeholder="Buscar número ou termos"
                  aria-label="Buscar issues"
                  className="h-8 text-xs"
                />
                <select
                  aria-label="Filtrar issues"
                  className="h-8 rounded-md border border-input bg-card px-1.5 text-xs"
                  value={listFilter}
                  onChange={(event) =>
                    setListFilter(event.target.value as "all" | "open" | "closed")
                  }
                >
                  <option value="all">Todas</option>
                  <option value="open">Abertas</option>
                  <option value="closed">Encerradas</option>
                </select>
              </div>
              <p className="mt-2 px-1 text-[10px] text-muted-foreground">
                Trocar o projeto aqui não muda o worktree do chat ao fundo.
              </p>
              <ul className="mt-2 space-y-1">
                {projectIssues.map((issue) => (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => selectIssue(issue.id)}
                      className={`w-full rounded-md border px-2.5 py-2 text-left transition-colors ${
                        currentIssue?.id === issue.id
                          ? "border-primary/40 bg-accent"
                          : "border-transparent bg-transparent hover:border-border hover:bg-card"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        #{issue.number}
                        <span className="truncate">{issue.title}</span>
                      </span>
                      <span className="mt-1 flex items-center gap-1">
                        <Badge variant={issue.state === "open" ? "success" : "muted"}>
                          {issue.state === "open" ? "aberta" : "encerrada"}
                        </Badge>
                        {issue.labels.slice(0, 2).map((label) => (
                          <Badge key={label} variant="outline">
                            {label}
                          </Badge>
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
                {projectIssues.length === 0 && (
                  <li className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Nenhuma issue nesta fixture para o filtro atual.
                  </li>
                )}
              </ul>
            </aside>

            <section
              className={`thin-scrollbar min-h-0 flex-col overflow-y-auto md:flex ${
                overlay.mobileView === "detail" ? "flex" : "hidden"
              }`}
            >
              {!currentIssue && (
                <div className="p-6 text-sm text-muted-foreground">
                  Escolha uma issue na lista para visualizar.
                </div>
              )}
              {currentIssue && (
                <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={currentIssue.state === "open" ? "success" : "muted"}>
                      {currentIssue.state === "open" ? "aberta" : "encerrada"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {currentIssue.repo}#{currentIssue.number}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {currentIssue.author} · atualizada {formatDateTime(currentIssue.updatedAt)}
                    </span>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="ml-auto"
                      disabled
                      title="Link externo desativado no demo"
                    >
                      Abrir no GitHub <ExternalLink />
                    </Button>
                  </div>
                  {currentIssue.editing && editDraft ? (
                    <div className="mt-3 space-y-2 rounded-lg border bg-slate-50 p-3">
                      <Label htmlFor={`issue-title-${currentIssue.id}`}>Título</Label>
                      <Input
                        id={`issue-title-${currentIssue.id}`}
                        value={editDraft.title}
                        onChange={(event) =>
                          setEditDrafts((previous) => ({
                            ...previous,
                            [currentIssue.id]: { ...editDraft, title: event.target.value },
                          }))
                        }
                      />
                      <Label htmlFor={`issue-body-${currentIssue.id}`}>Descrição</Label>
                      <Textarea
                        id={`issue-body-${currentIssue.id}`}
                        value={editDraft.body}
                        className="min-h-32 font-mono text-xs"
                        onChange={(event) =>
                          setEditDrafts((previous) => ({
                            ...previous,
                            [currentIssue.id]: { ...editDraft, body: event.target.value },
                          }))
                        }
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            dispatch({ type: "TOGGLE_ISSUE_EDIT", issueId: currentIssue.id })
                            setEditDrafts((previous) => {
                              const next = { ...previous }
                              delete next[currentIssue.id]
                              return next
                            })
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            dispatch({
                              type: "SAVE_ISSUE_EDIT",
                              issueId: currentIssue.id,
                              title: editDraft.title,
                              body: editDraft.body,
                            })
                            toast.success("Edição salva apenas na fixture local. Nenhuma issue real foi alterada.")
                          }}
                        >
                          Salvar alterações locais
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-2 flex items-start gap-2">
                        <h2 className="flex-1 text-xl font-semibold tracking-tight">
                          {currentIssue.title}
                        </h2>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Editar título e descrição da issue"
                          onClick={() =>
                            dispatch({ type: "TOGGLE_ISSUE_EDIT", issueId: currentIssue.id })
                          }
                        >
                          <Pencil />
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {currentIssue.labels.map((label) => (
                          <Badge key={label} variant="outline">
                            {label}
                          </Badge>
                        ))}
                      </div>
                      <MarkdownView content={currentIssue.body} className="mt-4" />
                    </>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setPrepareOpen(true)}>
                      <GitBranch /> Iniciar trabalho…
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addIssueToPrompt(currentIssue)}>
                      <MessageSquare /> Mencionar no prompt…
                    </Button>
                    {worktreeForIssue && worktreeForIssue.status !== "removed" && (
                      <Badge variant="outline" className="self-center">
                        worktree: {worktreeForIssue.name}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      Comentários
                      <Badge variant="secondary">{currentIssue.comments.length}</Badge>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {currentIssue.comments.length}/{currentIssue.comments.length} carregados
                      </span>
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {currentIssue.comments.map((comment) => (
                        <li key={comment.id} className="rounded-lg border bg-card p-3">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="font-medium text-foreground">{comment.author}</span>
                            <span>·</span>
                            <span>{formatDateTime(comment.createdAt)}</span>
                          </div>
                          <MarkdownView content={comment.body} className="mt-1.5 text-xs" />
                        </li>
                      ))}
                      {currentIssue.comments.length === 0 && (
                        <li className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                          Nenhum comentário carregado nesta fixture.
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="mt-5 rounded-lg border bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`comment-${currentIssue.id}`}>Novo comentário</Label>
                      <span className="text-[10px] text-muted-foreground">
                        publica como Você · identidade fictícia
                      </span>
                    </div>
                    <Textarea
                      id={`comment-${currentIssue.id}`}
                      value={draft}
                      onChange={(event) =>
                        dispatch({
                          type: "SET_ISSUE_DRAFT",
                          issueId: currentIssue.id,
                          value: event.target.value,
                        })
                      }
                      placeholder="Escreva um comentário. O rascunho é preservado ao fechar o painel."
                      className="mt-1.5 min-h-20 bg-card text-sm"
                    />
                    {currentIssue.publishState === "uncertain" && (
                      <Alert variant="warning" className="mt-2">
                        <div>
                          <p className="font-medium">Resultado incerto: a confirmação não chegou.</p>
                          <p className="mt-0.5">
                            O rascunho foi preservado. Não repetimos a publicação às cegas para evitar
                            comentário duplicado.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              size="xs"
                              onClick={() =>
                                dispatch({ type: "VERIFY_ISSUE_PUBLISH", issueId: currentIssue.id })
                              }
                            >
                              Verificar publicação
                            </Button>
                            <Button size="xs" variant="outline" onClick={() => setCompareOpen(true)}>
                              Continuar editando
                            </Button>
                          </div>
                        </div>
                      </Alert>
                    )}
                    {currentIssue.publishState === "confirmed" && (
                      <Alert variant="success" className="mt-2">
                        Comentário confirmado na fixture local. Nenhuma escrita externa ocorreu.
                      </Alert>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toast.info("Pré-visualização usa o mesmo Markdown do comentário; nada foi publicado.")
                        }
                      >
                        Pré-visualizar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => dispatch({ type: "PUBLISH_ISSUE_COMMENT", issueId: currentIssue.id })}
                        disabled={!draft.trim() || currentIssue.publishState === "uncertain"}
                        title={
                          currentIssue.publishState === "uncertain"
                            ? "Verifique a publicação anterior antes de tentar novamente"
                            : "Publica apenas na fixture local"
                        }
                      >
                        <Send /> Publicar comentário (fictício)
                      </Button>
                      <span className="text-[10px] text-muted-foreground">
                        Sem retry cego; falha de rede mantém o rascunho.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Dialog>

      <Dialog open={prepareOpen} onOpenChange={setPrepareOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Preparar worktree</DialogTitle>
            <DialogDescription>
              Esta preparação é apenas uma simulação local. Nenhum branch, diretório ou setup real
              será criado.
            </DialogDescription>
          </DialogHeader>
          {prepareResult ? (
            <Alert variant="warning">{prepareResult}</Alert>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Ambiente</Label>
                <p className="mt-1 rounded-md border bg-slate-50 px-2 py-1.5 text-sm">
                  {project?.environment} · {project?.environmentState}
                </p>
              </div>
              <div>
                <Label>Diretório do projeto</Label>
                <p className="mt-1 rounded-md border bg-slate-50 px-2 py-1.5 font-mono text-xs">
                  /srv/{project?.id}
                </p>
              </div>
              <div>
                <Label htmlFor="prepare-base">Base</Label>
                <Input id="prepare-base" defaultValue={project?.baseBranch ?? "main"} />
              </div>
              <div>
                <Label htmlFor="prepare-branch">Branch</Label>
                <Input
                  id="prepare-branch"
                  defaultValue={
                    currentIssue ? `issue-${currentIssue.number}-${currentIssue.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}` : "issue-demo"
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Setup do projeto</Label>
                <p className="mt-1 rounded-md border bg-slate-50 px-2 py-1.5 font-mono text-xs">
                  {project?.setupCommand}
                </p>
              </div>
              <div className="sm:col-span-2">
                <Label>Rito de integração</Label>
                <p className="mt-1 rounded-md border bg-slate-50 px-2 py-1.5 text-sm">
                  {project?.integrationRite === "pr" ? "PR com gates" : "Local + push"} · conforme
                  política do projeto
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrepareOpen(false)}>
              {prepareResult ? "Fechar" : "Cancelar"}
            </Button>
            {!prepareResult && (
              <Button
                onClick={() =>
                  setPrepareResult(
                    "Simulação concluída: nenhum worktree foi criado, nenhum setup foi executado e nenhum arquivo do host foi tocado.",
                  )
                }
              >
                Criar e executar setup (simulado)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rascunho preservado</DialogTitle>
            <DialogDescription>
              Continue editando o comentário. A verificação de publicação é a única ação que
              confirma o resultado neste cenário.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="info">
            Nenhum comentário duplicado foi criado. O texto continua somente na memória do demo.
          </Alert>
          <DialogFooter>
            <Button onClick={() => setCompareOpen(false)}>Voltar ao rascunho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
