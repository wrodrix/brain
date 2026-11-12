import * as React from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  CircleDot,
  GitBranch,
  History,
  Play,
  Plus,
  Settings2,
  TerminalSquare,
} from "lucide-react"

import { StatusBadge } from "@/components/common/status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surface"
import { useDemo } from "@/demo/DemoProvider"
import {
  getProject,
  getSessionsForWorktree,
  getWorktreesForProject,
} from "@/demo/selectors"
import { formatDateTime } from "@/lib/utils"
import { SetupLogDialog } from "./SetupLogDialog"

export function ProjectPage() {
  const { projectId } = useParams()
  const { state, dispatch } = useDemo()
  const navigate = useNavigate()
  const project = getProject(state, projectId)
  const [setupWorktreeId, setSetupWorktreeId] = React.useState<string | null>(null)
  const setupWorktree = state.worktrees.find((worktree) => worktree.id === setupWorktreeId) ?? null

  if (!project) return <Navigate to="/" replace />

  const worktrees = getWorktreesForProject(state, project.id)
  const removed = getWorktreesForProject(state, project.id, true).filter(
    (worktree) => worktree.status === "removed",
  )
  const issues = state.issues.filter((issue) => issue.projectId === project.id)
  const openIssue = issues.find((issue) => issue.state === "open") ?? issues[0]

  return (
    <div className="mx-auto max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to="/">
          <ArrowLeft /> Projetos
        </Link>
      </Button>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <StatusBadge kind="environment" value={project.environmentState} />
            <Badge variant="outline">{project.repo}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              openIssue &&
              dispatch({ type: "OPEN_ISSUE", issueId: openIssue.id, triggerLabel: "Projeto" })
            }
          >
            <CircleDot /> Issues
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/settings?project=${project.id}`)}>
            <Settings2 /> Configurar
          </Button>
          <Button size="sm" disabled title="Criação real de worktree pertence ao M3">
            <Plus /> Novo worktree
          </Button>
        </div>
      </div>

      {project.environmentState !== "connected" && (
        <Alert variant={project.environmentState === "offline" ? "danger" : "warning"} className="mt-3">
          Ambiente {project.environment} está {project.environmentState}. O histórico continua
          consultável; execução, terminal e cleanup ficam indisponíveis até reconectar. Nenhuma
          execução é movida para outro host automaticamente.
        </Alert>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Repositório", value: project.repo },
          { label: "Base configurada", value: project.baseBranch },
          { label: "Ambiente", value: project.environment },
          { label: "Conexão", value: project.connection },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-3">
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{item.label}</p>
              <p className="mt-1 truncate text-sm font-medium">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="size-4 text-primary" /> Worktrees ativos
              <Badge variant="secondary">{worktrees.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ul className="space-y-2">
              {worktrees.map((worktree) => {
                const sessions = getSessionsForWorktree(state, worktree.id)
                return (
                  <li key={worktree.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge kind="worktree" value={worktree.status} />
                      <span className="text-sm font-semibold">{worktree.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {worktree.branch}
                      </span>
                      <Button
                        size="xs"
                        className="ml-auto"
                        onClick={() =>
                          navigate(`/projects/${project.id}/worktrees/${worktree.id}?view=chat`)
                        }
                      >
                        <Play /> Abrir
                      </Button>
                    </div>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
                      <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">Path</dt>
                        <dd className="truncate font-mono">{worktree.path}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">Setup</dt>
                        <dd>
                          {worktree.setup.state === "succeeded"
                            ? "concluído"
                            : worktree.setup.state === "failed"
                              ? `falhou · exit ${worktree.setup.exitCode ?? "?"}`
                              : worktree.setup.state}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">Última atividade</dt>
                        <dd>{worktree.lastActivityLabel}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">Sessões</dt>
                        <dd>{sessions.map((session) => session.title).join(", ") || "nenhuma"}</dd>
                      </div>
                    </dl>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button size="xs" variant="outline" onClick={() => setSetupWorktreeId(worktree.id)}>
                        <TerminalSquare /> Logs do setup
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() =>
                          navigate(`/projects/${project.id}/worktrees/${worktree.id}?view=review`)
                        }
                      >
                        Revisão e integração
                      </Button>
                      <span className="self-center text-[10px] text-muted-foreground">
                        {worktree.status === "setup_failed"
                          ? "sessão não liberada como pronta"
                          : worktree.status === "integrated"
                            ? "integrado não encerra processos nem remove o checkout"
                            : ""}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">Ambiente e setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-1 text-xs">
              <div>
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Comando</p>
                <code className="mt-0.5 block rounded border bg-slate-50 px-2 py-1 font-mono text-[11px]">
                  {project.setupCommand}
                </code>
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Rito</p>
                <p className="mt-0.5">
                  {project.integrationRite === "pr" ? "PR com gates" : "Local + push"}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Preview</p>
                <p className="mt-0.5">URL privada fictícia; nada é exposto.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2 text-sm">
                <History className="size-4 text-muted-foreground" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <ul className="space-y-2">
                {removed.map((worktree) => {
                  const sessions = getSessionsForWorktree(state, worktree.id)
                  return (
                    <li key={worktree.id} className="rounded border border-dashed p-2 text-xs">
                      <p className="font-medium">{worktree.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {worktree.lastActivityLabel}
                      </p>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="mt-1 h-6 px-1"
                        onClick={() =>
                          navigate(
                            `/projects/${project.id}/worktrees/${worktree.id}?view=chat&session=${sessions[0]?.id ?? ""}`,
                          )
                        }
                      >
                        Abrir histórico
                      </Button>
                    </li>
                  )
                })}
                {removed.length === 0 && (
                  <li className="text-[11px] text-muted-foreground">Nenhum checkout removido.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">Última sessão</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 text-xs">
              {state.sessions
                .filter((session) =>
                  worktrees.some((worktree) => worktree.id === session.worktreeId),
                )
                .slice(0, 3)
                .map((session) => (
                  <div key={session.id} className="flex items-center gap-1.5 py-1">
                    <StatusBadge kind="session" value={session.status} dot={false} />
                    <span className="truncate">{session.title}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {formatDateTime(session.updatedAt)}
                    </span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
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
