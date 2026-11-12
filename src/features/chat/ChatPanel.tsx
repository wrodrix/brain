import * as React from "react"
import { ArrowDown, CircleStop, Square, Workflow } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
} from "@/components/ui/message-scroller"
import { Alert } from "@/components/ui/surface"
import { useDemo } from "@/demo/DemoProvider"
import {
  getJobsForSession,
  getJobsForWorktree,
  getSessionsForWorktree,
  mentionOptions,
} from "@/demo/selectors"
import type { Project, Session, Worktree } from "@/demo/types"
import { formatDateTime } from "@/lib/utils"
import { SetupLogDialog } from "@/features/projects/SetupLogDialog"
import { PlanPopover } from "@/features/usage/PlanPopover"
import type { MentionData } from "./ComposerEditor"
import { PromptComposer } from "./PromptComposer"
import { QueueStrip } from "./QueueStrip"
import { buildChatTurns } from "./build-chat-turns"
import { TurnView } from "./TurnView"
import { getChatScroll, rememberChatScroll } from "./scroll-memory"

function ScrollToRecentButton() {
  const { end } = useMessageScrollerScrollable()
  const { scrollToEnd } = useMessageScroller()
  if (!end) return null
  return (
    <Button
      size="xs"
      variant="ghost"
      className="pointer-events-auto ml-auto h-7 gap-1 text-[11px] text-muted-foreground"
      onClick={() => scrollToEnd({ behavior: "smooth" })}
      aria-label="Recentes: ir para a atividade recente"
      title="Ir para a atividade recente"
    >
      <ArrowDown className="size-3.5" />
      <span>Recentes</span>
    </Button>
  )
}

function SessionActivity({ onStop }: { onStop: () => void }) {
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onStop}
        title="Interromper execução (Esc)"
        className="group inline-flex h-7 items-center rounded-full border bg-card px-2.5 text-[11px] text-muted-foreground shadow-xs transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="grid">
          <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 group-hover:invisible group-focus-visible:invisible">
            <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-blue-600" />
            Executando…
          </span>
          <span className="invisible col-start-1 row-start-1 inline-flex items-center gap-1 text-foreground group-hover:visible group-focus-visible:visible">
            <Square className="size-3" aria-hidden="true" />
            Interromper
          </span>
        </span>
        <span className="sr-only">Interromper execução</span>
      </button>
    </div>
  )
}

function ScrollToTurn({ turnId }: { turnId: string | null }) {
  const { scrollToMessage } = useMessageScroller()
  React.useEffect(() => {
    if (!turnId) return
    const frame = requestAnimationFrame(() => {
      scrollToMessage(turnId, { align: "start", behavior: "auto" })
    })
    return () => cancelAnimationFrame(frame)
  }, [turnId, scrollToMessage])
  return null
}

export function ChatPanel({
  project,
  worktree,
  session,
  highlightedMessageId,
  onSelectSession,
  onOpenDiff,
  onOpenJobs,
}: {
  project: Project
  worktree: Worktree
  session: Session
  highlightedMessageId?: string | null
  onSelectSession: (sessionId: string) => void
  onOpenDiff?: () => void
  onOpenJobs?: () => void
}) {
  const { state, dispatch } = useDemo()
  const sessions = getSessionsForWorktree(state, worktree.id)
  const jobs = getJobsForSession(state, session.id)
  const worktreeJobs = getJobsForWorktree(state, worktree.id)
  const runningJobs = worktreeJobs.filter((job) => job.status === "running").length
  const turns = React.useMemo(() => buildChatTurns(session.messages), [session.messages])
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const scrollKey = `${state.ui.resetCount}:${session.id}`
  const [stopOpen, setStopOpen] = React.useState(false)
  const [setupOpen, setSetupOpen] = React.useState(false)
  const queue = state.ui.queue.filter((item) => item.sessionId === session.id)
  const pendingQueue = queue.filter(
    (item) => item.state === "admitted" || item.state === "delivered",
  )
  const mentionData = React.useMemo<MentionData>(
    () => mentionOptions(state, worktree.id),
    [state, worktree.id],
  )
  const highlightedTurnId =
    turns.find(
      (turn) =>
        turn.user?.id === highlightedMessageId ||
        turn.items.some((message) => message.id === highlightedMessageId),
    )?.id ?? null

  React.useEffect(() => {
    if (session.status !== "running") return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) {
        return
      }
      setStopOpen(true)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [session.status])

  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const saved = getChatScroll(scrollKey)
    if (saved === undefined) return
    const frame = requestAnimationFrame(() => {
      viewport.scrollTop = saved
    })
    return () => cancelAnimationFrame(frame)
  }, [scrollKey])

  const blockedReason =
    worktree.status === "setup_failed"
      ? "O setup falhou. A sessão não está pronta para envio."
      : worktree.status === "removed"
        ? "Checkout removido: histórico somente leitura."
        : project.environmentState === "offline"
          ? "Ambiente offline: envio indisponível até reconectar."
          : null

  function send(preference: "next-safe" | "after-current") {
    const draft = state.ui.drafts[session.id] ?? ""
    if (!draft.trim() || blockedReason) return
    dispatch({
      type: "SEND_MESSAGE",
      sessionId: session.id,
      content: draft,
      preference,
      sources: state.ui.composerSources[session.id] ?? [],
    })
    if (session.status === "running") {
      toast.info("Mensagem admitida na fila.", {
        description: "Ela será entregue no ponto seguro escolhido.",
      })
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <MessageScrollerProvider
        autoScroll={session.status === "running"}
        defaultScrollPosition={
          state.ui.scenario === "approval"
            ? "end"
            : session.status === "running"
              ? "end"
              : "start"
        }
        scrollPreviousItemPeek={0}
      >
      <div className="shrink-0 px-3 pt-1.5 sm:px-5 xl:hidden">
        <div className="mx-auto flex w-full max-w-3xl gap-3 overflow-x-auto">
          {sessions.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === session.id}
              onClick={() => onSelectSession(item.id)}
              className={`whitespace-nowrap border-b-2 pb-0.5 text-[11px] transition-colors ${
                item.id === session.id
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.title}
              {item.id === "sess-child" && <span className="ml-1 text-[9px]">filho</span>}
            </button>
          ))}
        </div>
      </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport
            ref={viewportRef}
            data-testid="chat-scroll"
            aria-label={`Conversa da sessão ${session.title}`}
            onScroll={(event) => rememberChatScroll(scrollKey, event.currentTarget.scrollTop)}
          >
            <MessageScrollerContent className="mx-auto w-full max-w-3xl px-5 pt-5 pb-14 sm:px-7 sm:pt-6">
              {worktree.status === "removed" && (
                <Alert variant="info">
                  <div>
                    <p className="font-medium">Checkout removido — histórico preservado.</p>
                    <p>
                      {session.historicalNote ??
                        "Sessões, evidências e anexos continuam consultáveis. Abrir este histórico não recria o worktree."}
                    </p>
                  </div>
                </Alert>
              )}

              {worktree.status === "setup_failed" && (
                <Alert variant="danger">
                  <div className="flex-1">
                    <p className="font-medium">Setup falhou · sessão não liberada como pronta.</p>
                    <p>
                      Exit code {worktree.setup.exitCode ?? "indisponível"}. O worktree foi criado,
                      mas o setup não concluiu.
                    </p>
                    <Button size="xs" variant="outline" className="mt-1.5" onClick={() => setSetupOpen(true)}>
                      Ver logs e exit code
                    </Button>
                  </div>
                </Alert>
              )}

              {project.environmentState !== "connected" && worktree.status !== "setup_failed" && (
                <Alert variant={project.environmentState === "offline" ? "danger" : "warning"}>
                  Ambiente {project.environment} está {project.environmentState}. O histórico
                  permanece legível; o envio fica indisponível até reconectar.
                </Alert>
              )}

              {turns.map((turn) => (
                <MessageScrollerItem
                  key={turn.id}
                  id={turn.id}
                  messageId={turn.id}
                  scrollAnchor={
                    Boolean(turn.user) &&
                    turn.user?.deliveryState !== "admitted" &&
                    turn.user?.deliveryState !== "delivered"
                  }
                  className="scroll-mt-4"
                >
                  <TurnView
                    turn={turn}
                    jobs={jobs}
                    onOpenDiff={onOpenDiff}
                    highlighted={
                      highlightedTurnId === turn.id && Boolean(highlightedMessageId)
                    }
                  />
                </MessageScrollerItem>
              ))}
              {session.status === "running" && (
                <SessionActivity onStop={() => setStopOpen(true)} />
              )}
              <ScrollToTurn turnId={highlightedTurnId} />
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>

        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10">
            <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-start gap-1.5 px-3 sm:px-5">
          {worktreeJobs.length > 0 && onOpenJobs && (
            <button
              type="button"
              onClick={onOpenJobs}
              className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-full border bg-card px-2.5 text-[11px] text-muted-foreground shadow-xs transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              title="Abrir subagentes e trabalhos em background"
            >
              <Workflow className="size-3.5" />
              {runningJobs > 0
                ? `${runningJobs} em background`
                : `Background · ${worktreeJobs.length}`}
              {runningJobs > 0 && (
                <span className="size-1.5 animate-pulse rounded-full bg-blue-600" />
              )}
            </button>
          )}
          <PlanPopover
            connections={state.connections}
            triggerClassName="pointer-events-auto h-7 rounded-full border bg-card px-2.5 shadow-xs hover:bg-secondary xl:hidden"
          />
          <ScrollToRecentButton />
            </div>
          </div>
        </div>
      </MessageScrollerProvider>

      {queue.length > 0 && (
        <QueueStrip
          items={queue}
          onPreference={(queueId, preference) =>
            dispatch({ type: "SET_QUEUE_PREFERENCE", queueId, preference })
          }
          onCancel={(queueId) => dispatch({ type: "CANCEL_QUEUE", queueId })}
        />
      )}

      <PromptComposer
        session={session}
        blockedReason={blockedReason}
        mentionData={mentionData}
        onSend={send}
        onStop={() => setStopOpen(true)}
      />

      <Dialog open={stopOpen} onOpenChange={setStopOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Interromper o agente?</DialogTitle>
            <DialogDescription>
              O escopo é esta execução. Trabalhos em background, terminais e processos têm escopos próprios; mensagens
              na fila não são descartadas. Atalho: Esc abre esta confirmação.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                dispatch({ type: "STOP_RUN", sessionId: session.id })
                setStopOpen(false)
                toast.info("Execução interrompida no cenário.")
              }}
            >
              <CircleStop /> Interromper execução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SetupLogDialog worktree={worktree} open={setupOpen} onOpenChange={setSetupOpen} />

      <div className="sr-only" aria-live="polite">
        {session.status === "running"
          ? `Sessão ${session.title} em execução simulada. ${pendingQueue.length} mensagens pendentes.`
          : `Sessão ${session.title} ociosa.`}
        {formatDateTime(session.updatedAt)}
      </div>
    </div>
  )
}
