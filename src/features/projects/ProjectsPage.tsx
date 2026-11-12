import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight,
  CircleDot,
  GitBranch,
  History,
  Layers,
  Plus,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { StatusBadge } from "@/components/common/status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surface"
import { useDemo } from "@/demo/DemoProvider"
import {
  getIssuesForProject,
  getSessionsForWorktree,
  getWorktreesForProject,
} from "@/demo/selectors"
import { formatDateTime } from "@/lib/utils"
import { SetupLogDialog } from "./SetupLogDialog"

export function ProjectsPage() {
  const { state, dispatch } = useDemo()
  const navigate = useNavigate()
  const [setupWorktreeId, setSetupWorktreeId] = React.useState<string | null>(null)
  const setupWorktree = state.worktrees.find((worktree) => worktree.id === setupWorktreeId) ?? null

  const activeWorktrees = state.worktrees.filter((worktree) => worktree.status !== "removed")
  const removedWorktrees = state.worktrees.filter((worktree) => worktree.status === "removed")

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Projetos e trabalho</h1>
            <Badge variant="warning">dados fictícios</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Retome um projeto, abra um worktree e continue de onde parou. Ambiente, branch, setup e
            conexão aparecem sempre no mesmo lugar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/usage")}>
            <ShieldCheck /> Cotas e conexões
          </Button>
          <Button size="sm" disabled title="Criar projeto real pertence aos próximos marcos">
            <Plus /> Novo projeto (indisponível)
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Projetos", value: state.projects.length, icon: Layers },
          { label: "Worktrees ativos", value: activeWorktrees.length, icon: GitBranch },
          { label: "Checkouts removidos", value: removedWorktrees.length, icon: History },
          {
            label: "Ambientes online",
            value: state.projects.filter((project) => project.environmentState === "connected").length,
            icon: Server,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <stat.icon className="size-4" />
              </span>
              <div>
                <p className="text-lg leading-none font-semibold">{stat.value}</p>
                <p className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                  {stat.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert variant="warning" className="mt-4">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Sparkles className="size-3.5" />
          <span>
            Esta demonstração não executa agentes, Git ou comandos. Merge, remoção e setup são
            simulações locais.
          </span>
          <Button
            size="xs"
            variant="ghost"
            className="ml-auto text-amber-900"
            onClick={() => navigate("/projects/atlas/worktrees/wt-login?view=chat")}
          >
            Abrir trabalho de exemplo <ArrowRight />
          </Button>
        </div>
      </Alert>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {state.projects.map((project) => {
          const worktrees = getWorktreesForProject(state, project.id)
          const issues = getIssuesForProject(state, project.id)
          const openIssue = issues.find((issue) => issue.state === "open") ?? issues[0]
          return (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="border-b bg-slate-50/60">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {project.name}
                      <StatusBadge kind="environment" value={project.environmentState} />
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">{project.description}</p>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Configurar ${project.name}`}
                    onClick={() => navigate(`/settings?project=${project.id}`)}
                  >
                    <Settings2 />
                  </Button>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <div className="flex gap-1.5">
                    <dt className="text-muted-foreground">Repo</dt>
                    <dd className="truncate font-medium">{project.repo}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-muted-foreground">Base</dt>
                    <dd className="font-mono">{project.baseBranch}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-muted-foreground">Ambiente</dt>
                    <dd>{project.environment}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-muted-foreground">Conexão</dt>
                    <dd className="truncate">{project.connection.split(" · ")[0]}</dd>
                  </div>
                </dl>
              </CardHeader>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Worktrees
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    {worktrees.length} ativo{worktrees.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {worktrees.map((worktree) => {
                    const sessions = getSessionsForWorktree(state, worktree.id)
                    const lastSession = sessions[0]
                    return (
                      <li
                        key={worktree.id}
                        className="rounded-lg border bg-card p-2.5 transition-colors hover:border-slate-300"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge kind="worktree" value={worktree.status} />
                          <span className="text-sm font-medium">{worktree.name}</span>
                          <span className="text-[11px] text-muted-foreground">· {worktree.branch}</span>
                          <Button
                            size="xs"
                            variant="outline"
                            className="ml-auto"
                            onClick={() =>
                              navigate(
                                worktree.status === "setup_failed"
                                  ? `/projects/${project.id}/worktrees/${worktree.id}?view=chat`
                                  : `/projects/${project.id}/worktrees/${worktree.id}?view=chat`,
                              )
                            }
                          >
                            {worktree.status === "setup_failed" ? "Inspecionar falha" : "Abrir"}
                          </Button>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{worktree.lastActivityLabel}</span>
                          <span>{sessions.length} sessão(ões)</span>
                          {lastSession && <span>última: {lastSession.title}</span>}
                          {worktree.status === "setup_failed" && (
                            <button
                              type="button"
                              className="font-medium text-red-700 underline-offset-2 hover:underline"
                              onClick={() => setSetupWorktreeId(worktree.id)}
                            >
                              ver logs e exit code
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-2">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      openIssue &&
                      dispatch({ type: "OPEN_ISSUE", issueId: openIssue.id, triggerLabel: "Projetos" })
                    }
                  >
                    <CircleDot /> Ver issues ({issues.length})
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    Detalhes do projeto
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled
                    title="Criar worktree real pertence ao M3"
                  >
                    <Plus /> Novo worktree
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <History className="size-4 text-muted-foreground" /> Checkouts removidos
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Sessões e evidências continuam disponíveis; abrir o histórico não recria o worktree.
          </p>
        </CardHeader>
        <CardContent className="p-3">
          <ul className="space-y-1.5">
            {removedWorktrees.map((worktree) => {
              const sessions = getSessionsForWorktree(state, worktree.id)
              const project = state.projects.find((item) => item.id === worktree.projectId)
              return (
                <li
                  key={worktree.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2.5"
                >
                  <Badge variant="muted">checkout removido</Badge>
                  <span className="text-sm font-medium">{worktree.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {project?.name} · {sessions.length} sessão(ões) retida(s)
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    className="ml-auto"
                    onClick={() =>
                      navigate(
                        `/projects/${worktree.projectId}/worktrees/${worktree.id}?view=chat&session=${sessions[0]?.id ?? ""}`,
                      )
                    }
                  >
                    Abrir histórico
                  </Button>
                </li>
              )
            })}
            {removedWorktrees.length === 0 && (
              <li className="rounded border border-dashed p-3 text-xs text-muted-foreground">
                Nenhum checkout removido neste cenário.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      <div className="mt-4 overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50/60 px-3 py-2">
          <h2 className="text-xs font-semibold">Sessões recentes</h2>
          <span className="text-[10px] text-muted-foreground">
            A busca global encontra termos dentro das mensagens e ferramentas.
          </span>
        </div>
        <ul className="divide-y">
          {state.sessions.slice(0, 5).map((session) => {
            const worktree = state.worktrees.find((item) => item.id === session.worktreeId)
            const project = state.projects.find((item) => item.id === worktree?.projectId)
            return (
              <li key={session.id} className="flex items-center gap-2 px-3 py-2">
                <StatusBadge kind="session" value={session.status} />
                <span className="text-xs font-medium">{session.title}</span>
                <span className="text-[11px] text-muted-foreground">
                  {project?.name} / {worktree?.name}
                </span>
                <span className="ml-auto hidden text-[10px] text-muted-foreground sm:inline">
                  {formatDateTime(session.updatedAt)}
                </span>
                <Link
                  to={`/projects/${worktree?.projectId}/worktrees/${worktree?.id}?view=chat&session=${session.id}`}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`Abrir sessão ${session.title}`}
                >
                  <ArrowRight className="size-4" />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <SetupLogDialog
        worktree={setupWorktree}
        open={Boolean(setupWorktree)}
        onOpenChange={(open) => {
          if (!open) setSetupWorktreeId(null)
        }}
      />
    </div>
  )
}
