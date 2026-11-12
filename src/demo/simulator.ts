import { createInitialState } from "./fixtures"
import type {
  DemoState,
  FileBuffer,
  MergeState,
  Message,
  QueueItem,
  Session,
  SourceRef,
} from "./types"

export type DemoAction =
  | { type: "ADVANCE" }
  | { type: "SET_PLAYING"; playing: boolean }
  | { type: "RESET" }
  | { type: "SET_SCENARIO"; scenario: DemoState["ui"]["scenario"] }
  | { type: "SET_DRAFT"; sessionId: string; value: string }
  | { type: "ADD_SOURCE"; sessionId: string; source: SourceRef }
  | { type: "REMOVE_SOURCE"; sessionId: string; sourceId: string }
  | {
      type: "SEND_MESSAGE"
      sessionId: string
      content: string
      preference: QueueItem["preference"]
      sources: SourceRef[]
    }
  | { type: "SET_QUEUE_PREFERENCE"; queueId: string; preference: QueueItem["preference"] }
  | { type: "CANCEL_QUEUE"; queueId: string }
  | { type: "STOP_RUN"; sessionId: string }
  | { type: "SET_ACTIVE_SESSION"; worktreeId: string; sessionId: string }
  | { type: "SET_SESSION_MODEL"; sessionId: string; model: string; effort: string }
  | { type: "SELECT_FILE"; worktreeId: string; fileId: string }
  | { type: "OPEN_ISSUE"; issueId: string; triggerLabel: string }
  | { type: "CLOSE_ISSUE" }
  | { type: "SET_ISSUE_MOBILE_VIEW"; view: "list" | "detail" }
  | { type: "SET_ISSUE_DRAFT"; issueId: string; value: string }
  | { type: "PUBLISH_ISSUE_COMMENT"; issueId: string }
  | { type: "VERIFY_ISSUE_PUBLISH"; issueId: string }
  | { type: "TOGGLE_ISSUE_EDIT"; issueId: string }
  | { type: "SAVE_ISSUE_EDIT"; issueId: string; title: string; body: string }
  | { type: "OPEN_FILE_BUFFER"; fileId: string }
  | { type: "UPDATE_FILE_BUFFER"; fileId: string; content: string }
  | { type: "SAVE_FILE"; fileId: string }
  | { type: "DISCARD_FILE_BUFFER"; fileId: string }
  | { type: "RELOAD_FILE_BUFFER"; fileId: string }
  | { type: "SIMULATE_EXTERNAL_CHANGE"; fileId: string }
  | {
      type: "SET_SEARCH"
      patch: Partial<DemoState["ui"]["search"]>
    }
  | { type: "OPEN_SEARCH_RESULT"; resultId: string }
  | { type: "ADD_SEARCH_RESULT_TO_PROMPT"; resultId: string; sessionId: string }
  | { type: "MERGE_PR"; prId: string; method: "merge" | "squash" }
  | { type: "REVALIDATE_REVIEW"; prId: string }
  | { type: "REMOVE_WORKTREE"; worktreeId: string }
  | { type: "END_PROCESS"; processId: string }
  | { type: "CONFIRM_APPROVAL"; toolId: string; decision: "allow" | "deny" }
  | { type: "CANCEL_JOB"; jobId: string }

const STREAM_CHUNKS = [
  "\n\n- Lendo `url.intended` antes de regenerar a sessão.",
  "\n- Validando apenas caminhos internos para evitar open redirect.",
  "\n- `LoginRedirectTest` cobre o retorno a `/reports`.",
  "\n\n```php\n$target = $request->session()->pull('url.intended', '/dashboard');\n\nif (! str_starts_with($target, '/')) {\n    $target = '/dashboard';\n}\n\nreturn redirect()->to($target);\n```\n\nO worktree continua disponível para revisão.",
]

const TERMINAL_APPEND = [
  "✓ 2 testes de autenticação concluídos",
  "→ aguardando gate de revisão",
  "→ nenhuma escrita adicional",
]

function updateSession(
  sessions: Session[],
  sessionId: string,
  update: (session: Session) => Session,
): Session[] {
  return sessions.map((session) => (session.id === sessionId ? update(session) : session))
}

function updateMessage(
  sessions: Session[],
  sessionId: string,
  messageId: string,
  update: (message: Message) => Message,
): Session[] {
  return updateSession(sessions, sessionId, (session) => ({
    ...session,
    messages: session.messages.map((message) =>
      message.id === messageId ? update(message) : message,
    ),
  }))
}

function addEventMessage(state: DemoState, sessionId: string, content: string): DemoState {
  const session = state.sessions.find((item) => item.id === sessionId)
  if (!session) return state
  const event: Message = {
    id: `msg-event-${state.ui.sim.tick}-${sessionId}`,
    sessionId,
    role: "event",
    content,
    createdAt: new Date().toISOString(),
  }
  return {
    ...state,
    sessions: updateSession(state.sessions, sessionId, (item) => ({
      ...item,
      messages: [...item.messages, event],
    })),
  }
}

function processQueue(state: DemoState): DemoState {
  const pending = state.ui.queue
  if (pending.length === 0) return state

  let sessions = state.sessions
  const nextQueue = pending.map((item) => {
    if (item.state === "admitted") {
      sessions = updateMessage(sessions, item.sessionId, item.messageId, (message) => ({
        ...message,
        deliveryState: "delivered",
      }))
      return { ...item, state: "delivered" as const }
    }
    if (item.state === "delivered") {
      const finalState = item.preference === "next-safe" ? ("incorporated" as const) : ("deferred" as const)
      sessions = updateMessage(sessions, item.sessionId, item.messageId, (message) => ({
        ...message,
        deliveryState: finalState,
      }))
      return { ...item, state: finalState }
    }
    return item
  })

  return { ...state, sessions, ui: { ...state.ui, queue: nextQueue } }
}

function advanceSimulation(state: DemoState): DemoState {
  const tick = state.ui.sim.tick + 1
  const scenario = state.ui.scenario
  let next: DemoState = {
    ...state,
    ui: { ...state.ui, sim: { ...state.ui.sim, tick } },
  }

  if (scenario === "during-run") {
    const chunk = STREAM_CHUNKS[tick - 1]
    if (chunk) {
      next = {
        ...next,
        sessions: updateMessage(next.sessions, "sess-impl", "msg-plan", (message) => ({
          ...message,
          content: message.content + chunk,
          streaming: tick < STREAM_CHUNKS.length,
        })),
      }
    }

    if (tick >= 2) {
      next = {
        ...next,
        jobs: next.jobs.map((job) =>
          job.id === "job-tests"
            ? {
                ...job,
                status: "completed",
                lastActivity: "concluído · exit 0",
                output: "PASS  Tests\\Feature\\LoginRedirectTest\n1 test passed · exit 0",
              }
            : job,
        ),
        sessions: updateMessage(next.sessions, "sess-impl", "msg-tool-tests", (message) =>
          message.tool
            ? {
                ...message,
                tool: {
                  ...message.tool,
                  state: "succeeded",
                  output:
                    "PASS  Tests\\Feature\\LoginRedirectTest\n1 test passed · exit 0",
                },
              }
            : message,
        ),
      }
    }

    if (tick >= 3) {
      next = {
        ...next,
        jobs: next.jobs.map((job) =>
          job.id === "job-review"
            ? {
                ...job,
                status: "completed",
                lastActivity: "concluído · resumo entregue",
                output: "1 arquivo revisado, nenhuma escrita. Resumo curto entregue ao pai.",
              }
            : job,
        ),
        sessions: updateMessage(next.sessions, "sess-impl", "msg-subagent", (message) =>
          message.tool
            ? {
                ...message,
                tool: {
                  ...message.tool,
                  state: "succeeded",
                  output: "1 arquivo revisado, nenhuma escrita.",
                },
              }
            : message,
        ),
      }
    }

    if (tick >= 4) {
      next = {
        ...next,
        sessions: updateMessage(next.sessions, "sess-impl", "msg-plan", (message) => ({
          ...message,
          streaming: false,
        })),
      }
    }
  }

  if (scenario === "normal" && tick >= 2) {
    next = {
      ...next,
      prs: next.prs.map((pr) =>
        pr.id === "pr-login" && pr.mergeState !== "merged"
          ? {
              ...pr,
              gates: pr.gates.map((gate) =>
                gate.id === "gate-tests"
                  ? {
                      ...gate,
                      status: "passed",
                      detail: "18 testes aprovados no SHA a1b2c3d.",
                    }
                  : gate.id === "gate-preview"
                    ? {
                        ...gate,
                        status: "passed",
                        detail: "Preview concluído; gate opcional.",
                      }
                    : gate,
              ),
              updatedAt: new Date().toISOString(),
            }
          : pr,
      ),
    }
  }

  if (scenario === "network") {
    const environmentState =
      tick <= 1 ? "offline" : tick === 2 ? "degraded" : "connected"
    next = {
      ...next,
      projects: next.projects.map((project) =>
        project.id === "atlas" ? { ...project, environmentState } : project,
      ),
      terminals: next.terminals.map((terminal) =>
        terminal.id === "term-1"
          ? {
              ...terminal,
              status: tick >= 3 ? "ended" : "reconnecting",
              stateLabel:
                tick >= 3
                  ? "PTY encerrado simulado · não é recriado automaticamente"
                  : "reconectando · sem reenvio de teclas",
            }
          : terminal,
      ),
    }
  }

  if (scenario === "normal" && tick <= TERMINAL_APPEND.length) {
    next = {
      ...next,
      terminals: next.terminals.map((terminal) =>
        terminal.id === "term-2"
          ? { ...terminal, output: [...terminal.output, TERMINAL_APPEND[tick - 1]] }
          : terminal,
      ),
    }
  }

  const queuedMerge = next.prs.find((pr) => pr.mergeState === "queued")
  if (queuedMerge) {
    const method = queuedMerge.mergeMethod ?? "squash"
    next = {
      ...next,
      prs: next.prs.map((pr) =>
        pr.id === queuedMerge.id
          ? {
              ...pr,
              state: "merged",
              mergeState: "merged",
              updatedAt: new Date().toISOString(),
              note: `Integração confirmada no cenário (${method}). O worktree permanece disponível; nenhum remoto real foi alterado.`,
            }
          : pr,
      ),
      worktrees: next.worktrees.map((worktree) =>
        worktree.id === queuedMerge.worktreeId
          ? {
              ...worktree,
              status: "integrated",
              integratedAt: new Date().toISOString(),
              lastActivityLabel: "integrado · worktree mantido",
            }
          : worktree,
      ),
    }
    next = addEventMessage(
      next,
      "sess-impl",
      "Merge confirmado no cenário simulado. O checkout continua disponível e o histórico foi preservado.",
    )
  }

  next = processQueue(next)

  const hasMoreSimulation = tick < next.ui.sim.totalTicks
  const hasPendingQueue = next.ui.queue.some(
    (item) => item.state === "admitted" || item.state === "delivered",
  )
  if (!hasMoreSimulation && !hasPendingQueue && !next.prs.some((pr) => pr.mergeState === "queued")) {
    next = { ...next, ui: { ...next.ui, sim: { ...next.ui.sim, playing: false } } }
  }

  return next
}

function cloneInitial(scenario: DemoState["ui"]["scenario"], resetCount: number): DemoState {
  const initial = createInitialState(scenario)
  return { ...initial, ui: { ...initial.ui, resetCount } }
}

function resolveSearchSnippet(
  state: DemoState,
  resultId: string,
): { title: string; text: string } | null {
  const [first, second] = resultId.split(":")
  if (first === "file") {
    const file = state.files.find((item) => item.id === second)
    return file ? { title: file.path, text: file.content.slice(0, 400) } : null
  }
  if (first === "issue") {
    const issue = state.issues.find((item) => item.id === second)
    return issue ? { title: `${issue.repo}#${issue.number}`, text: issue.body.slice(0, 400) } : null
  }
  const session = state.sessions.find((item) => item.id === first)
  if (!session) return null
  if (second === "job") {
    const job = state.jobs.find((item) => item.id === resultId.split(":")[2])
    return job ? { title: job.name, text: job.output.slice(0, 400) } : null
  }
  const message = session.messages.find((item) => item.id === second)
  if (!message) return null
  const text = message.tool
    ? `${message.content} — ${message.tool.name}: ${message.tool.output ?? message.tool.args}`
    : message.content
  return { title: session.title, text: text.slice(0, 400) }
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "ADVANCE":
      return advanceSimulation(state)

    case "SET_PLAYING": {
      if (action.playing && state.ui.sim.tick >= state.ui.sim.totalTicks) {
        return {
          ...state,
          ui: {
            ...state.ui,
            sim: { ...state.ui.sim, tick: 0, playing: true },
          },
        }
      }
      return {
        ...state,
        ui: { ...state.ui, sim: { ...state.ui.sim, playing: action.playing } },
      }
    }

    case "RESET":
      return cloneInitial(state.ui.scenario, state.ui.resetCount + 1)

    case "SET_SCENARIO":
      return cloneInitial(action.scenario, state.ui.resetCount + 1)

    case "SET_DRAFT":
      return {
        ...state,
        ui: {
          ...state.ui,
          drafts: { ...state.ui.drafts, [action.sessionId]: action.value },
        },
      }

    case "ADD_SOURCE": {
      const current = state.ui.composerSources[action.sessionId] ?? []
      if (current.some((source) => source.id === action.source.id)) return state
      return {
        ...state,
        ui: {
          ...state.ui,
          composerSources: {
            ...state.ui.composerSources,
            [action.sessionId]: [...current, action.source],
          },
        },
      }
    }

    case "REMOVE_SOURCE":
      return {
        ...state,
        ui: {
          ...state.ui,
          composerSources: {
            ...state.ui.composerSources,
            [action.sessionId]: (state.ui.composerSources[action.sessionId] ?? []).filter(
              (source) => source.id !== action.sourceId,
            ),
          },
        },
      }

    case "SEND_MESSAGE": {
      const content = action.content.trim()
      if (!content) return state
      const session = state.sessions.find((item) => item.id === action.sessionId)
      if (!session) return state
      const running = session.status === "running"
      const messageId = `msg-local-${state.ui.sim.tick}-${session.messages.length + 1}`
      const message: Message = {
        id: messageId,
        sessionId: session.id,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        sources: action.sources,
        deliveryState: running ? "admitted" : undefined,
        deliveryPreference: running ? action.preference : undefined,
      }
      const queueItem: QueueItem | null = running
        ? {
            id: `queue-${session.id}-${state.ui.sim.tick}-${state.ui.queue.length + 1}`,
            sessionId: session.id,
            messageId,
            content,
            sources: action.sources,
            admittedAt: new Date().toISOString(),
            state: "admitted",
            preference: action.preference,
            note:
              action.preference === "next-safe"
                ? "Será entregue no próximo ponto seguro e o agente decide incorporar ou adiar."
                : "Aguardará o fim do trabalho atual antes da entrega.",
          }
        : null

      return {
        ...state,
        sessions: updateSession(state.sessions, session.id, (item) => ({
          ...item,
          messages: [...item.messages, message],
        })),
        ui: {
          ...state.ui,
          drafts: { ...state.ui.drafts, [session.id]: "" },
          composerSources: { ...state.ui.composerSources, [session.id]: [] },
          queue: queueItem ? [...state.ui.queue, queueItem] : state.ui.queue,
        },
      }
    }

    case "SET_QUEUE_PREFERENCE":
      return {
        ...state,
        ui: {
          ...state.ui,
          queue: state.ui.queue.map((item) =>
            item.id === action.queueId && item.state === "admitted"
              ? { ...item, preference: action.preference }
              : item,
          ),
        },
      }

    case "CANCEL_QUEUE":
      return {
        ...state,
        ui: {
          ...state.ui,
          queue: state.ui.queue.filter((item) => item.id !== action.queueId),
        },
        sessions: state.sessions.map((session) => ({
          ...session,
          messages: session.messages.filter(
            (message) =>
              !(
                state.ui.queue.find((item) => item.id === action.queueId)?.messageId ===
                message.id
              ),
          ),
        })),
      }

    case "STOP_RUN": {
      const updated = updateSession(state.sessions, action.sessionId, (session) => ({
        ...session,
        status: "interrupted",
        messages: session.messages.map((message) =>
          message.streaming ? { ...message, streaming: false } : message,
        ),
      }))
      return addEventMessage(
        { ...state, sessions: updated },
        action.sessionId,
        "Execução interrompida pelo usuário. Esta ação é separada do envio de mensagens; a fila não foi descartada.",
      )
    }

    case "SET_SESSION_MODEL":
      return {
        ...state,
        sessions: updateSession(state.sessions, action.sessionId, (session) => ({
          ...session,
          model: action.model,
          effort: action.effort,
        })),
      }

    case "SET_ACTIVE_SESSION":
      return {
        ...state,
        ui: {
          ...state.ui,
          activeSessionByWorktree: {
            ...state.ui.activeSessionByWorktree,
            [action.worktreeId]: action.sessionId,
          },
        },
      }

    case "SELECT_FILE":
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedFileByWorktree: {
            ...state.ui.selectedFileByWorktree,
            [action.worktreeId]: action.fileId,
          },
        },
      }

    case "OPEN_ISSUE":
      return {
        ...state,
        ui: {
          ...state.ui,
          issueOverlay: {
            open: true,
            issueId: action.issueId,
            mobileView: "detail",
            triggerLabel: action.triggerLabel,
          },
        },
      }

    case "CLOSE_ISSUE":
      return {
        ...state,
        ui: {
          ...state.ui,
          issueOverlay: { ...state.ui.issueOverlay, open: false, triggerLabel: null },
        },
      }

    case "SET_ISSUE_MOBILE_VIEW":
      return {
        ...state,
        ui: {
          ...state.ui,
          issueOverlay: { ...state.ui.issueOverlay, mobileView: action.view },
        },
      }

    case "SET_ISSUE_DRAFT":
      return {
        ...state,
        ui: {
          ...state.ui,
          issueCommentDrafts: {
            ...state.ui.issueCommentDrafts,
            [action.issueId]: action.value,
          },
        },
      }

    case "PUBLISH_ISSUE_COMMENT": {
      const issue = state.issues.find((item) => item.id === action.issueId)
      const draft = (state.ui.issueCommentDrafts[action.issueId] ?? "").trim()
      if (!issue || !draft) return state

      if (state.ui.scenario === "network") {
        return {
          ...state,
          issues: state.issues.map((item) =>
            item.id === action.issueId ? { ...item, publishState: "uncertain" } : item,
          ),
        }
      }

      const comment = {
        id: `c-${issue.id}-${issue.comments.length + 1}-${state.ui.resetCount}`,
        author: "Você",
        body: draft,
        createdAt: new Date().toISOString(),
      }
      return {
        ...state,
        issues: state.issues.map((item) =>
          item.id === action.issueId
            ? {
                ...item,
                comments: [...item.comments, comment],
                publishState: "confirmed",
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
        ui: {
          ...state.ui,
          issueCommentDrafts: { ...state.ui.issueCommentDrafts, [action.issueId]: "" },
        },
      }
    }

    case "VERIFY_ISSUE_PUBLISH": {
      const issue = state.issues.find((item) => item.id === action.issueId)
      const draft = state.ui.issueCommentDrafts[action.issueId] ?? ""
      if (!issue || issue.publishState !== "uncertain") return state
      const comment = {
        id: `c-${issue.id}-verified-${issue.comments.length + 1}`,
        author: "Você",
        body: draft,
        createdAt: new Date().toISOString(),
      }
      return {
        ...state,
        issues: state.issues.map((item) =>
          item.id === action.issueId
            ? {
                ...item,
                comments: [...item.comments, comment],
                publishState: "confirmed",
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
        ui: {
          ...state.ui,
          issueCommentDrafts: { ...state.ui.issueCommentDrafts, [action.issueId]: "" },
        },
      }
    }

    case "TOGGLE_ISSUE_EDIT":
      return {
        ...state,
        issues: state.issues.map((issue) =>
          issue.id === action.issueId ? { ...issue, editing: !issue.editing } : issue,
        ),
      }

    case "SAVE_ISSUE_EDIT":
      return {
        ...state,
        issues: state.issues.map((issue) =>
          issue.id === action.issueId
            ? {
                ...issue,
                title: action.title,
                body: action.body,
                editing: false,
                updatedAt: new Date().toISOString(),
              }
            : issue,
        ),
      }

    case "OPEN_FILE_BUFFER": {
      const file = state.files.find((item) => item.id === action.fileId)
      if (!file || state.ui.fileBuffers[file.id]) return state
      const buffer: FileBuffer = {
        content: file.content,
        baseVersion: file.version,
        dirty: false,
        conflict: false,
      }
      return {
        ...state,
        ui: { ...state.ui, fileBuffers: { ...state.ui.fileBuffers, [file.id]: buffer } },
      }
    }

    case "UPDATE_FILE_BUFFER": {
      const buffer = state.ui.fileBuffers[action.fileId]
      if (!buffer) return state
      return {
        ...state,
        ui: {
          ...state.ui,
          fileBuffers: {
            ...state.ui.fileBuffers,
            [action.fileId]: {
              ...buffer,
              content: action.content,
              dirty: action.content !== buffer.content ? true : buffer.dirty,
            },
          },
        },
      }
    }

    case "SAVE_FILE": {
      const file = state.files.find((item) => item.id === action.fileId)
      const buffer = state.ui.fileBuffers[action.fileId]
      if (!file || !buffer) return state
      if (file.version !== buffer.baseVersion) {
        return {
          ...state,
          ui: {
            ...state.ui,
            fileBuffers: {
              ...state.ui.fileBuffers,
              [file.id]: {
                ...buffer,
                conflict: true,
                externalVersion: file.version,
                externalContent: file.content,
              },
            },
          },
        }
      }
      return {
        ...state,
        files: state.files.map((item) =>
          item.id === file.id
            ? {
                ...item,
                content: buffer.content,
                version: item.version + 1,
                status: item.status === "unchanged" ? "modified" : item.status,
              }
            : item,
        ),
        ui: {
          ...state.ui,
          fileBuffers: {
            ...state.ui.fileBuffers,
            [file.id]: {
              content: buffer.content,
              baseVersion: file.version + 1,
              dirty: false,
              conflict: false,
            },
          },
        },
      }
    }

    case "DISCARD_FILE_BUFFER":
    case "RELOAD_FILE_BUFFER": {
      const file = state.files.find((item) => item.id === action.fileId)
      if (!file) return state
      return {
        ...state,
        ui: {
          ...state.ui,
          fileBuffers: {
            ...state.ui.fileBuffers,
            [file.id]: {
              content: file.content,
              baseVersion: file.version,
              dirty: false,
              conflict: false,
            },
          },
        },
      }
    }

    case "SIMULATE_EXTERNAL_CHANGE": {
      const file = state.files.find((item) => item.id === action.fileId)
      if (!file || file.binary) return state
      const suffix =
        file.language === "php"
          ? "\n\n// Alteração externa simulada: o agente ajustou o middleware.\n"
          : "\n\nAlteração externa simulada pelo cenário.\n"
      const nextContent = `${file.content}${suffix}`
      const nextVersion = file.version + 1
      const buffer = state.ui.fileBuffers[file.id]
      return {
        ...state,
        files: state.files.map((item) =>
          item.id === file.id
            ? { ...item, content: nextContent, version: nextVersion, status: "modified" }
            : item,
        ),
        ui: {
          ...state.ui,
          fileBuffers: buffer
            ? {
                ...state.ui.fileBuffers,
                [file.id]: {
                  ...buffer,
                  conflict: true,
                  externalContent: nextContent,
                  externalVersion: nextVersion,
                },
              }
            : state.ui.fileBuffers,
        },
      }
    }

    case "SET_SEARCH":
      return {
        ...state,
        ui: { ...state.ui, search: { ...state.ui.search, ...action.patch } },
      }

    case "OPEN_SEARCH_RESULT":
      return {
        ...state,
        ui: {
          ...state.ui,
          search: { ...state.ui.search, openedResultId: action.resultId },
        },
      }

    case "ADD_SEARCH_RESULT_TO_PROMPT": {
      const session = state.sessions.find((item) => item.id === action.sessionId)
      if (!session) return state
      const resultId = action.resultId
      const resolved = resolveSearchSnippet(state, resultId)
      const currentDraft = state.ui.drafts[action.sessionId] ?? ""
      const snippetSource: SourceRef = {
        id: `src-snippet-${resultId}`,
        kind: "snippet",
        label: "Trecho do histórico",
        detail: `${resolved?.title ?? "resultado"} · adicionado explicitamente`,
        provenance:
          "Busca no histórico retido. Abrir o resultado não anexa contexto automaticamente.",
        content: resolved?.text ?? "Trecho não disponível.",
      }
      const quoted = (resolved?.text ?? "").replace(/\n+/g, " ").slice(0, 180)
      const nextDraft = `${currentDraft}${currentDraft ? "\n\n" : ""}> Trecho do histórico (${resolved?.title ?? "resultado"}): ${quoted || "conteúdo indisponível"}\n\n`
      const currentSources = state.ui.composerSources[action.sessionId] ?? []
      return {
        ...state,
        ui: {
          ...state.ui,
          drafts: { ...state.ui.drafts, [action.sessionId]: nextDraft },
          composerSources: currentSources.some((source) => source.id === snippetSource.id)
            ? state.ui.composerSources
            : {
                ...state.ui.composerSources,
                [action.sessionId]: [...currentSources, snippetSource],
              },
        },
      }
    }

    case "MERGE_PR": {
      const pr = state.prs.find((item) => item.id === action.prId)
      if (!pr || pr.mergeState === "queued" || pr.mergeState === "merged") return state
      const blocked =
        pr.state === "unavailable" ||
        pr.state === "blocked" ||
        pr.gates.some((gate) => gate.required && gate.status !== "passed") ||
        pr.reviewedSha !== pr.sha ||
        !pr.mergeMethods.includes(action.method)
      if (blocked) return state
      return {
        ...state,
        prs: state.prs.map((item) =>
          item.id === action.prId
            ? {
                ...item,
                mergeState: "queued" as MergeState,
                mergeMethod: action.method,
                mergeRequestedAt: new Date().toISOString(),
                note: "Merge solicitado e em fila. Ainda não é integração confirmada.",
              }
            : item,
        ),
        ui: {
          ...state.ui,
          sim: {
            ...state.ui.sim,
            totalTicks: Math.max(state.ui.sim.totalTicks, state.ui.sim.tick + 2),
          },
        },
      }
    }

    case "REVALIDATE_REVIEW":
      return {
        ...state,
        prs: state.prs.map((pr) =>
          pr.id === action.prId
            ? {
                ...pr,
                reviewedSha: pr.sha,
                note:
                  pr.gates.some((gate) => gate.required && gate.status !== "passed")
                    ? "Evidência revalidada no SHA atual. Gates obrigatórios ainda bloqueiam o merge."
                    : "Evidência revalidada no SHA atual.",
              }
            : pr,
        ),
      }

    case "REMOVE_WORKTREE":
      return {
        ...state,
        worktrees: state.worktrees.map((worktree) =>
          worktree.id === action.worktreeId
            ? {
                ...worktree,
                status: "removed",
                removedFromActive: true,
                lastActivityLabel: "checkout removido · histórico preservado",
              }
            : worktree,
        ),
        sessions: state.sessions.map((session) =>
          session.worktreeId === action.worktreeId
            ? {
                ...session,
                status: "historical",
                historicalNote:
                  "Checkout removido manualmente no cenário. Sessões, evidências e anexos continuam disponíveis.",
              }
            : session,
        ),
      }

    case "END_PROCESS":
      return {
        ...state,
        processes: state.processes.map((process) =>
          process.id === action.processId
            ? {
                ...process,
                status: "ended",
                cpu: null,
                memory: null,
                reason: "Encerramento simulado confirmado neste cenário. Nenhum processo real foi afetado.",
              }
            : process,
        ),
      }

    case "CONFIRM_APPROVAL":
      return {
        ...state,
        sessions: state.sessions.map((session) => ({
          ...session,
          messages: session.messages.map((message) =>
            message.tool?.id === action.toolId
              ? {
                  ...message,
                  tool: {
                    ...message.tool,
                    state: action.decision === "allow" ? "executing" : "denied",
                    approval: message.tool.approval
                      ? { ...message.tool.approval, decision: action.decision }
                      : undefined,
                  },
                }
              : message,
          ),
        })),
      }

    case "CANCEL_JOB":
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === action.jobId
            ? {
                ...job,
                status: "cancel_requested",
                lastActivity: "cancelamento solicitado · aguardando confirmação",
                cancellationNote:
                  "Solicitado não é confirmado. Efeitos já realizados não são desfeitos automaticamente.",
              }
            : job,
        ),
      }

    default:
      return state
  }
}

