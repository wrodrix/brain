import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowUpRight, History, Search, UserRound } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/primitives"
import { Input } from "@/components/ui/form"
import { useDemo } from "@/demo/DemoProvider"
import {
  getActiveSession,
  getProject,
  getWorktree,
  getWorktreesForProject,
  searchHistory,
  searchTargetLabel,
} from "@/demo/selectors"
import { formatDateTime } from "@/lib/utils"
import { cn } from "@/lib/utils"

function HighlightedSnippet({
  snippet,
  matchStart,
  matchLength,
}: {
  snippet: string
  matchStart: number
  matchLength: number
}) {
  if (matchLength <= 0 || matchStart < 0 || matchStart >= snippet.length) {
    return <>{snippet}</>
  }
  const before = snippet.slice(0, matchStart)
  const match = snippet.slice(matchStart, matchStart + matchLength)
  const after = snippet.slice(matchStart + matchLength)
  return (
    <>
      {before}
      <mark className="rounded bg-amber-200/80 px-0.5 text-amber-950">{match}</mark>
      {after}
    </>
  )
}

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { state, dispatch } = useDemo()
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const results = React.useMemo(() => searchHistory(state), [state])

  const worktreeMatch = /\/projects\/[^/]+\/worktrees\/([^/?]+)/.exec(location.pathname)
  const currentWorktreeId = worktreeMatch?.[1] ?? null
  const currentWorktree = getWorktree(state, currentWorktreeId)
  const currentSession = currentWorktree
    ? getActiveSession(state, currentWorktree.id)
    : null
  const targetProject = currentWorktree
    ? getProject(state, currentWorktree.projectId)
    : null

  React.useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [open])

  function openResult(resultId: string) {
    const result = results.find((item) => item.id === resultId)
    if (!result) return
    dispatch({ type: "OPEN_SEARCH_RESULT", resultId })
    onOpenChange(false)

    if (result.kind === "issue") {
      dispatch({ type: "OPEN_ISSUE", issueId: result.messageId, triggerLabel: "Busca de histórico" })
      return
    }
    if (result.kind === "file") {
      navigate(
        `/projects/${result.projectId}/worktrees/${result.worktreeId}?view=files&file=${result.messageId}`,
      )
      dispatch({ type: "SELECT_FILE", worktreeId: result.worktreeId, fileId: result.messageId })
      return
    }
    if (result.kind === "job") {
      navigate(
        `/projects/${result.projectId}/worktrees/${result.worktreeId}?view=chat&job=${result.messageId}`,
      )
      return
    }
    navigate(
      `/projects/${result.projectId}/worktrees/${result.worktreeId}?view=chat&session=${result.sessionId}&message=${result.messageId}`,
    )
  }

  function addToPrompt(resultId: string) {
    if (!currentSession) {
      toast.error("Abra um worktree para escolher a sessão de destino.")
      return
    }
    dispatch({
      type: "ADD_SEARCH_RESULT_TO_PROMPT",
      resultId,
      sessionId: currentSession.id,
    })
    toast.success(`Trecho adicionado ao rascunho de ${currentSession.title}.`, {
      description: "A inclusão foi explícita e separada da abertura do resultado.",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-3 p-4 sm:w-[calc(100%-2rem)] sm:p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            Buscar no histórico de sessões
          </DialogTitle>
          <DialogDescription>
            Busca local nas fixtures. Abrir um trecho não anexa contexto ao prompt; a inclusão é
            uma ação separada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={state.ui.search.query}
              onChange={(event) =>
                dispatch({ type: "SET_SEARCH", patch: { query: event.target.value } })
              }
              placeholder='Ex.: "redirect", LoginRedirectTest, path ou "falha"'
              aria-label="Termo de busca no histórico"
              className="pl-8"
            />
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="hidden sm:inline-flex">
            Fechar
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Modo</span>
            <select
              aria-label="Modo de busca"
              className="h-7 rounded-md border border-input bg-card px-2 text-xs"
              value={state.ui.search.mode}
              onChange={(event) =>
                dispatch({
                  type: "SET_SEARCH",
                  patch: { mode: event.target.value as typeof state.ui.search.mode },
                })
              }
            >
              <option value="terms">Termos</option>
              <option value="phrase">Frase exata</option>
              <option value="literal">Literal / código</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Escopo</span>
            <select
              aria-label="Escopo da busca"
              className="h-7 rounded-md border border-input bg-card px-2 text-xs"
              value={state.ui.search.scope}
              onChange={(event) =>
                dispatch({
                  type: "SET_SEARCH",
                  patch: { scope: event.target.value as typeof state.ui.search.scope },
                })
              }
            >
              <option value="all">Todo o histórico acessível</option>
              <option value="project">Projeto</option>
              <option value="worktree">Worktree</option>
            </select>
          </label>
          {state.ui.search.scope !== "all" && (
            <select
              aria-label="Projeto da busca"
              className="h-7 max-w-48 rounded-md border border-input bg-card px-2 text-xs"
              value={
                state.ui.search.scope === "project"
                  ? (state.ui.search.projectId ?? "")
                  : (currentWorktree?.projectId ?? "")
              }
              onChange={(event) => {
                const projectId = event.target.value
                dispatch({
                  type: "SET_SEARCH",
                  patch: {
                    projectId,
                    worktreeId: getWorktreesForProject(state, projectId)[0]?.id ?? null,
                  },
                })
              }}
            >
              <option value="">Escolher projeto</option>
              {state.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
          {state.ui.search.scope === "worktree" && (
            <select
              aria-label="Worktree da busca"
              className="h-7 max-w-52 rounded-md border border-input bg-card px-2 text-xs"
              value={state.ui.search.worktreeId ?? ""}
              onChange={(event) =>
                dispatch({
                  type: "SET_SEARCH",
                  patch: { worktreeId: event.target.value || null },
                })
              }
            >
              <option value="">Escolher worktree</option>
              {state.worktrees.map((worktree) => (
                <option key={worktree.id} value={worktree.id}>
                  {worktree.name}
                  {worktree.status === "removed" ? " (histórico)" : ""}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-muted-foreground">
            <Checkbox
              checked={state.ui.search.includeSubagents}
              onCheckedChange={(checked) =>
                dispatch({
                  type: "SET_SEARCH",
                  patch: { includeSubagents: checked === true },
                })
              }
              aria-label="Incluir subagentes"
            />
            Incluir subagentes
          </label>
          <Badge variant="outline" className="ml-auto">
            {searchTargetLabel(state)}
          </Badge>
        </div>

        <div className="thin-scrollbar -mx-1 min-h-40 flex-1 overflow-y-auto px-1">
          {!state.ui.search.query.trim() && (
            <div className="rounded-lg border border-dashed p-5 text-center">
              <p className="text-sm font-medium">Busque termos, frases, paths ou identificadores.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Exemplos: <code className="rounded bg-secondary px-1">redirect</code>,{" "}
                <code className="rounded bg-secondary px-1">LoginRedirectTest</code>,{" "}
                <code className="rounded bg-secondary px-1">Falhou</code>.
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                O histórico inclui uma sessão com checkout removido; abri-la não recria o worktree.
              </p>
            </div>
          )}
          {state.ui.search.query.trim() && results.length === 0 && (
            <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              Nenhum resultado neste cenário. A ausência não prova que o conteúdo não existe em um
              índice real.
            </div>
          )}
          <ul className="space-y-2">
            {results.map((result) => (
              <li
                key={result.id}
                className={cn(
                  "rounded-lg border bg-card p-3",
                  state.ui.search.openedResultId === result.id && "border-primary/50",
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge variant="outline">{result.kind}</Badge>
                  <span className="font-medium">{result.title}</span>
                  <span className="text-muted-foreground">
                    {getProject(state, result.projectId)?.name} / {getWorktree(state, result.worktreeId)?.name}
                  </span>
                  {result.removedWorktree && <Badge variant="muted">checkout removido</Badge>}
                  {result.subagent && <Badge variant="warning">subagente</Badge>}
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {formatDateTime(result.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  <HighlightedSnippet
                    snippet={result.snippet}
                    matchStart={result.matchStart}
                    matchLength={result.matchLength}
                  />
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="xs" variant="outline" onClick={() => openResult(result.id)}>
                    <ArrowUpRight /> Abrir neste trecho
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => addToPrompt(result.id)}
                    disabled={!currentSession}
                    title={
                      currentSession
                        ? `Adicionar ao rascunho de ${currentSession.title}`
                        : "Abra um worktree para adicionar ao prompt"
                    }
                  >
                    Adicionar ao prompt
                  </Button>
                  {currentSession && targetProject && (
                    <span className="self-center text-[10px] text-muted-foreground">
                      destino: {targetProject.name} / {currentSession.title}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 border-t pt-2 text-[11px] text-muted-foreground">
          <UserRound className="size-3.5" />
          Resultados limitados às fixtures deste demo. Sem acesso a conversas reais.
        </div>
      </DialogContent>
    </Dialog>
  )
}
