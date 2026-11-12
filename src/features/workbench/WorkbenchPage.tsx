import * as React from "react"
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  Activity,
  ArrowLeft,
  Brain,
  CircleDot,
  Files as FilesIcon,
  Gauge,
  GitPullRequest,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  SquareTerminal,
  Workflow,
  X,
} from "lucide-react"

import { StatusBadge } from "@/components/common/status"
import { Input } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/dialog"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useDemo } from "@/demo/DemoProvider"
import {
  buildFileTree,
  getActiveSession,
  getFilesForWorktree,
  getIssue,
  getJobsForWorktree,
  getProject,
  getSessionsForWorktree,
  getWorktree,
} from "@/demo/selectors"
import { cn } from "@/lib/utils"
import { ChatPanel } from "@/features/chat/ChatPanel"
import { AccountMenu } from "@/features/shell/AccountMenu"
import { useShellActions } from "@/features/shell/shell-actions"
import { FileTree } from "@/features/files/FileTree"
import { filterFileTree } from "@/features/files/file-tree-filter"
import { FilesPanel } from "@/features/files/FilesPanel"
import { JobsPanel } from "@/features/jobs/JobsPanel"
import { ReviewPanel } from "@/features/review/ReviewPanel"
import { ConsumptionPanel } from "@/features/ops/ConsumptionPanel"
import { PlanPopover } from "@/features/usage/PlanPopover"
import { ProcessesPanel } from "@/features/ops/ProcessesPanel"
import { PreviewPanel, TerminalPanel } from "@/features/ops/TerminalPreviewPanels"
import { WorkbenchActivityBar } from "@/features/workbench/WorkbenchActivityBar"

const views = [
  "chat",
  "files",
  "jobs",
  "review",
  "terminal",
  "preview",
  "processes",
  "usage",
  "ops",
] as const
type WorkbenchView = (typeof views)[number]
type DrawerKind = "jobs" | "terminal" | "preview" | "processes" | "usage"

const drawerTitles: Record<DrawerKind, string> = {
  jobs: "Trabalho em background",
  terminal: "Terminal demonstrativo",
  preview: "Previews",
  processes: "Processos do worktree",
  usage: "Consumo e cotas",
}

function isView(value: string | null): value is WorkbenchView {
  return Boolean(value && views.includes(value as WorkbenchView))
}

function ActiveSessionSync({
  worktreeId,
  sessionId,
}: {
  worktreeId: string
  sessionId: string | null
}) {
  const { state, dispatch } = useDemo()
  React.useEffect(() => {
    if (!sessionId) return
    if (state.ui.activeSessionByWorktree[worktreeId] !== sessionId) {
      dispatch({ type: "SET_ACTIVE_SESSION", worktreeId, sessionId })
    }
  }, [worktreeId, sessionId, state.ui.activeSessionByWorktree, dispatch])
  return null
}

function environmentDot(state: string) {
  return state === "connected"
    ? "bg-green-600"
    : state === "degraded"
      ? "bg-amber-600"
      : "bg-red-600"
}

function useNarrowWorkbench() {
  const [narrow, setNarrow] = React.useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 1279px)").matches,
  )
  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 1279px)")
    const update = () => setNarrow(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return narrow
}

export function WorkbenchPage() {
  const { projectId, worktreeId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state, dispatch } = useDemo()
  const project = getProject(state, projectId)
  const worktree = getWorktree(state, worktreeId)
  const [filePanelOpen, setFilePanelOpen] = React.useState(false)
  const [drawer, setDrawer] = React.useState<DrawerKind | null>(null)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [fileQuery, setFileQuery] = React.useState("")
  const narrow = useNarrowWorkbench()
  const shell = useShellActions()

  const view: WorkbenchView = isView(searchParams.get("view"))
    ? (searchParams.get("view") as WorkbenchView)
    : "chat"
  const sessionParam = searchParams.get("session")
  const messageParam = searchParams.get("message")
  const fileParam = searchParams.get("file")
  const jobParam = searchParams.get("job")

  if (!project || !worktree) return <Navigate to="/" replace />

  const sessions = getSessionsForWorktree(state, worktree.id)
  const activeSession =
    sessions.find((session) => session.id === sessionParam) ??
    getActiveSession(state, worktree.id) ??
    sessions[0] ??
    null
  const files = getFilesForWorktree(state, worktree.id)
  const tree = filterFileTree(buildFileTree(files), fileQuery)
  const jobs = getJobsForWorktree(state, worktree.id)
  const issue = worktree.issueId ? getIssue(state, worktree.issueId) : null
  const selectedFileId = state.ui.selectedFileByWorktree[worktree.id] ?? files[0]?.id ?? null
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? files[0] ?? null
  const changedFiles = files.filter((file) => file.status !== "unchanged").length
  const terminals = state.terminals.filter((terminal) => terminal.worktreeId === worktree.id)
  const previews = state.previews.filter((preview) => preview.worktreeId === worktree.id)
  const suspicious = state.processes.filter(
    (process) => process.worktreeId === worktree.id && process.status === "suspicious",
  ).length
  const runningJobs = jobs.filter((job) => job.status === "running").length
  const activeDrawer = drawer ?? (jobParam ? "jobs" : null)
  const showFilePanel = filePanelOpen || Boolean(fileParam) || view === "files"

  function setView(next: string) {
    if (!isView(next)) return
    const params = new URLSearchParams(searchParams)
    params.set("view", next)
    if (activeSession) params.set("session", activeSession.id)
    params.delete("message")
    if (next !== "files") params.delete("file")
    if (next !== "jobs") params.delete("job")
    setSearchParams(params, { replace: true })
    setMoreOpen(false)
  }

  function selectSession(sessionId: string) {
    dispatch({ type: "SET_ACTIVE_SESSION", worktreeId: worktree!.id, sessionId })
    const params = new URLSearchParams(searchParams)
    params.set("view", "chat")
    params.set("session", sessionId)
    params.delete("message")
    setSearchParams(params, { replace: true })
  }

  function openFile(fileId: string) {
    dispatch({ type: "SELECT_FILE", worktreeId: worktree!.id, fileId })
    dispatch({ type: "OPEN_FILE_BUFFER", fileId })
    setFilePanelOpen(true)
    const params = new URLSearchParams(searchParams)
    params.set("view", "chat")
    if (activeSession) params.set("session", activeSession.id)
    params.delete("file")
    params.delete("job")
    params.delete("message")
    setSearchParams(params, { replace: true })
  }

  function closeFilePanel() {
    setFilePanelOpen(false)
    const params = new URLSearchParams(searchParams)
    params.delete("file")
    if (params.get("view") === "files") params.set("view", "chat")
    setSearchParams(params, { replace: true })
  }

  function openDrawer(kind: DrawerKind) {
    setDrawer(kind)
    setMoreOpen(false)
    if (jobParam) {
      const params = new URLSearchParams(searchParams)
      params.delete("job")
      setSearchParams(params, { replace: true })
    }
  }

  function openIssues(triggerLabel: string) {
    const target =
      issue ??
      state.issues.find((item) => item.projectId === project?.id && item.state === "open") ??
      state.issues[0]
    if (target) dispatch({ type: "OPEN_ISSUE", issueId: target.id, triggerLabel })
  }

  function closeDrawer() {
    setDrawer(null)
    if (jobParam) {
      const params = new URLSearchParams(searchParams)
      params.delete("job")
      setSearchParams(params, { replace: true })
    }
  }

  const chatVisible = view === "chat" || view === "files"
  const chatPanelNode =
    chatVisible && activeSession && !(narrow && view === "files") ? (
      <div className="h-full">
        <ChatPanel
          key={`${activeSession.id}-${state.ui.resetCount}`}
          project={project}
          worktree={worktree}
          session={activeSession}
          highlightedMessageId={messageParam}
          onSelectSession={selectSession}
          onOpenDiff={() => setView("files")}
          onOpenJobs={() => openDrawer("jobs")}
        />
      </div>
    ) : chatVisible && !(narrow && view === "files") ? (
      <div className="p-6 text-sm text-muted-foreground">Nenhuma sessão nesta fixture.</div>
    ) : null

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ActiveSessionSync worktreeId={worktree.id} sessionId={activeSession?.id ?? null} />
      <header className="shrink-0 border-b bg-card">
        <div className="flex min-h-12 flex-wrap items-center gap-x-1.5 gap-y-1 px-2 py-1.5 sm:gap-x-2 sm:px-3">
          <Button
            asChild
            size="icon-sm"
            variant="ghost"
            className="xl:hidden"
            aria-label="Voltar para o projeto"
          >
            <Link to={`/projects/${project.id}`}>
              <ArrowLeft />
            </Link>
          </Button>
          <Link
            to="/"
            aria-label="Brain — ir para projetos"
            title="Brain — projetos"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Brain className="size-4" />
          </Link>
          <div className="hidden min-w-0 items-center gap-1 text-[11px] xl:flex">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Projetos
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link
              to={`/projects/${project.id}`}
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              {project.name}
            </Link>
            <span className="text-muted-foreground">/</span>
          </div>
          <h1 className="min-w-0 max-w-60 truncate text-sm font-semibold">{worktree.name}</h1>
          <Badge variant="outline" className="hidden font-mono text-[10px] sm:inline-flex">
            {worktree.branch}
          </Badge>
          <StatusBadge
            kind="environment"
            value={project.environmentState}
            className="hidden md:inline-flex"
          />
          {issue && (
            <button
              type="button"
              onClick={() => openIssues("Cabeçalho do worktree")}
              aria-label={`Abrir issue #${issue.number}: ${issue.title}`}
              title={`#${issue.number} ${issue.title}`}
              className="inline-flex max-w-32 items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <CircleDot className="size-3 shrink-0" />
              <span className="truncate">#{issue.number}</span>
            </button>
          )}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={shell.openSearch}
              aria-label="Buscar sessões"
              title="Buscar sessões (⌘K)"
            >
              <Search />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => openIssues("Cabeçalho do worktree")}
              aria-label="Abrir issues"
              title="Abrir issues"
            >
              <CircleDot />
            </Button>
            <AccountMenu onOpenGuide={shell.openGuide} onOpenAbout={shell.openAbout} />
            <Button
              size="xs"
              variant="ghost"
              className="hidden xl:inline-flex"
              onClick={() => openDrawer("preview")}
            >
              <LayoutDashboard /> Previews
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="hidden xl:inline-flex"
              onClick={() => openDrawer("terminal")}
              title="Abrir terminal demonstrativo; sem PTY real"
            >
              <SquareTerminal /> Terminal{" "}
              <Badge variant="muted" className="px-1 py-0 text-[9px]">
                {terminals.length}
              </Badge>
            </Button>
            <Button
              size="xs"
              variant="outline"
              aria-label="Revisão"
              onClick={() => setView("review")}
            >
              <GitPullRequest /> <span className="hidden sm:inline">Revisão</span>
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="xl:hidden"
              aria-label="Mais áreas do worktree"
              onClick={() => setMoreOpen(true)}
            >
              <LayoutDashboard />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 pb-1.5 text-[10px] text-muted-foreground sm:px-3 xl:hidden">
          <Link
            to={`/projects/${project.id}`}
            className="inline-flex min-h-6 items-center hover:text-foreground"
          >
            {project.name}
          </Link>
          <span>·</span>
          <span className="truncate">{worktree.path}</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <WorkbenchActivityBar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          onSearch={shell.openSearch}
          onOpenIssue={() => openIssues("Menu lateral")}
        />
        {!sidebarCollapsed && (
        <aside
          className="hidden w-60 shrink-0 flex-col border-r bg-card xl:flex"
          aria-label="Worktree, sessões e arquivos"
        >
          <div className="border-b p-2">
            <div className="mb-1 flex items-center justify-between gap-1">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Sessões
              </p>
              <span className="text-[9px] text-muted-foreground">{sessions.length}</span>
            </div>
            <ul className="space-y-0.5">
              {sessions.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => selectSession(session.id)}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] hover:bg-secondary",
                      session.id === activeSession?.id && "bg-accent font-medium text-accent-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        session.status === "running" && "bg-blue-600",
                        session.status === "idle" && "bg-slate-400",
                        session.status === "interrupted" && "bg-amber-600",
                        session.status === "historical" && "bg-slate-300",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{session.title}</span>
                    {session.id === "sess-child" && <Badge variant="muted">filho</Badge>}
                  </button>
                </li>
              ))}
            </ul>
            <Button size="xs" variant="ghost" className="mt-1 w-full justify-start" disabled title="Nova sessão real pertence ao M3">
              + Nova sessão
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <FilesIcon className="size-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Arquivos
              </p>
              <span className="text-[9px] text-muted-foreground">{files.length}</span>
              {changedFiles > 0 && (
                <span className="ml-auto text-[9px] text-muted-foreground">
                  {changedFiles} alterado{changedFiles === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="px-1.5 pb-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={fileQuery}
                  onChange={(event) => setFileQuery(event.target.value)}
                  placeholder="Buscar arquivo"
                  aria-label="Buscar arquivo no worktree"
                  className="h-7 pr-7 pl-7 text-xs"
                />
                {fileQuery && (
                  <button
                    type="button"
                    onClick={() => setFileQuery("")}
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label="Limpar busca de arquivo"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
              {tree.length > 0 ? (
                <FileTree
                  nodes={tree}
                  selectedId={selectedFile?.id ?? null}
                  onSelect={(file) => openFile(file.id)}
                />
              ) : (
                <p className="px-1.5 py-3 text-[11px] text-muted-foreground">
                  Nenhum arquivo encontrado.
                </p>
              )}
            </div>
            <p className="border-t px-2 py-1.5 text-[9px] text-muted-foreground">
              M/A indicam alterações no worktree.
            </p>
          </div>
        </aside>
        )}

        {showFilePanel && chatVisible && !narrow ? (
          <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
            <ResizablePanel defaultSize="62%" minSize="38%" className="min-w-0">
              {chatPanelNode}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize="38%" minSize="26%" maxSize="55%">
              <div className="flex h-full min-h-0 flex-col border-l bg-card">
                <FilesPanel
                  worktree={worktree}
                  focusFileId={fileParam}
                  panel
                  onClose={closeFilePanel}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
        <div className="min-w-0 flex-1">
          {chatPanelNode}
          {view === "files" && narrow && (
            <FilesPanel worktree={worktree} focusFileId={fileParam} />
          )}
          {view === "jobs" && <JobsPanel worktree={worktree} focusJobId={jobParam} />}
          {view === "review" && (
            <ReviewPanel project={project} worktree={worktree} onNavigateView={setView} />
          )}
          {view === "terminal" && <TerminalPanel worktree={worktree} />}
          {view === "preview" && <PreviewPanel worktree={worktree} />}
          {view === "processes" && (
            <ProcessesPanel worktree={worktree} onNavigateView={() => openDrawer("jobs")} />
          )}
          {view === "usage" && (
            <div className="thin-scrollbar h-full overflow-y-auto p-3">
              <ConsumptionPanel />
            </div>
          )}
          {view === "ops" && (
            <div className="thin-scrollbar h-full overflow-y-auto p-3">
              <h2 className="text-sm font-semibold">Painel operacional</h2>
              <p className="text-[11px] text-muted-foreground">
                Estados operacionais do worktree. Todos os números são fictícios ou explicitamente
                indisponíveis.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[
                  {
                    label: "Terminal",
                    detail: `${terminals.length} terminal(is) · sem shell conectada`,
                    action: () => openDrawer("terminal"),
                  },
                  {
                    label: "Preview",
                    detail: `${previews.length} preview(s) · nenhuma URL aberta`,
                    action: () => openDrawer("preview"),
                  },
                  {
                    label: "Processos",
                    detail: `${state.processes.filter((p) => p.worktreeId === worktree.id).length} grupo(s) · métricas do cenário`,
                    action: () => openDrawer("processes"),
                  },
                  {
                    label: "Consumo e cotas",
                    detail: "contexto, uso e quota em painéis distintos",
                    action: () => openDrawer("usage"),
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="rounded-lg border bg-card p-3 text-left hover:border-primary/40 hover:bg-accent/40"
                  >
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{item.detail}</p>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <ConsumptionPanel compact />
              </div>
            </div>
          )}
        </div>

        )}
      </div>

      <footer className="hidden shrink-0 items-center gap-2 border-t bg-card px-3 py-1 text-[11px] text-muted-foreground xl:flex">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", environmentDot(project.environmentState))} />
          {project.environment} · {project.connection.split(" · ")[0]} · {project.environmentState}
        </span>
        <span className="text-border">|</span>
        <span className="truncate">{worktree.lastActivityLabel}</span>
        <div className="ml-auto flex items-center gap-2">
          <PlanPopover connections={state.connections} triggerClassName="h-6" />
          <Button
            size="xs"
            variant="ghost"
            className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground"
            onClick={() => openDrawer("processes")}
          >
            <Activity className="size-3.5" /> Processos
            {suspicious > 0 && (
              <Badge variant="warning" className="px-1 py-0 text-[9px]">
                {suspicious}
              </Badge>
            )}
          </Button>
        </div>
      </footer>

      <nav
        className="flex shrink-0 border-t bg-card pb-[env(safe-area-inset-bottom)] xl:hidden"
        aria-label="Navegação do worktree"
      >
        {[
          { view: "chat" as const, icon: MessageSquare, label: "Chat" },
          { view: "files" as const, icon: FilesIcon, label: "Arquivos" },
        ].map((item) => (
          <button
            key={item.view}
            type="button"
            onClick={() => setView(item.view)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium",
              view === item.view ? "text-primary" : "text-muted-foreground",
            )}
            aria-current={view === item.view ? "page" : undefined}
          >
            <item.icon className="size-5" />
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => openDrawer("jobs")}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium",
            activeDrawer === "jobs" ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Workflow className="size-5" />
          Background
          {runningJobs > 0 && <span className="-mt-0.5 size-1 rounded-full bg-blue-600" />}
        </button>
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground"
        >
          <LayoutDashboard className="size-5" />
          Mais
        </button>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="max-h-[80dvh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mais áreas</DialogTitle>
            <DialogDescription>
              Revisão, operação e configuração do worktree. Dados fictícios.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 py-2 text-left"
              onClick={() => setView("review")}
            >
              <GitPullRequest className="size-4" />
              <span className="text-[11px]">Revisão e merge</span>
            </Button>
            {[
              { label: "Terminal", kind: "terminal" as const, icon: SquareTerminal },
              { label: "Preview", kind: "preview" as const, icon: LayoutDashboard },
              { label: "Processos", kind: "processes" as const, icon: Activity },
              { label: "Consumo e cotas", kind: "usage" as const, icon: Gauge },
            ].map((item) => (
              <Button
                key={item.kind}
                variant="outline"
                className="h-auto flex-col items-start gap-1 py-2 text-left"
                onClick={() => openDrawer(item.kind)}
              >
                <item.icon className="size-4" />
                <span className="text-[11px]">{item.label}</span>
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 py-2 text-left"
              onClick={() => {
                setMoreOpen(false)
                navigate("/settings")
              }}
            >
              <Settings className="size-4" />
              <span className="text-[11px]">Configurações</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 py-2 text-left"
              onClick={() => {
                setMoreOpen(false)
                if (issue) dispatch({ type: "OPEN_ISSUE", issueId: issue.id, triggerLabel: "Mais" })
              }}
            >
              <CircleDot className="size-4" />
              <span className="text-[11px]">Issue do worktree</span>
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Terminal e preview não executam nada. Processos e cotas são estados do cenário.
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activeDrawer)} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
          <div className="flex h-9 shrink-0 items-center justify-end border-b px-1.5">
            <SheetTitle className="sr-only">
              {activeDrawer ? drawerTitles[activeDrawer] : "Recursos"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Painel de recursos do worktree; dados fictícios e sem execução real.
            </SheetDescription>
            <Button
              size="icon-sm"
              variant="ghost"
              className="size-7 text-muted-foreground"
              onClick={closeDrawer}
              aria-label="Fechar painel de recursos"
            >
              <X />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {activeDrawer === "jobs" && (
              <JobsPanel worktree={worktree} focusJobId={jobParam} />
            )}
            {activeDrawer === "terminal" && <TerminalPanel worktree={worktree} />}
            {activeDrawer === "preview" && <PreviewPanel worktree={worktree} />}
            {activeDrawer === "processes" && (
              <ProcessesPanel
                worktree={worktree}
                onNavigateView={() => openDrawer("jobs")}
              />
            )}
            {activeDrawer === "usage" && (
              <div className="thin-scrollbar h-full overflow-y-auto p-3">
                <h2 className="mb-2 text-sm font-semibold">Consumo e cotas</h2>
                <ConsumptionPanel />
              </div>
            )}
          </div>
        </SheetContent>
      </Dialog>

    </div>
  )
}
