import { describe, expect, it } from "vitest"

import { createInitialState } from "./fixtures"
import { demoReducer } from "./simulator"
import { searchHistory } from "./selectors"
import type { DemoState } from "./types"

function stateFor(scenario: DemoState["ui"]["scenario"] = "normal") {
  return createInitialState(scenario)
}

describe("simulador determinístico", () => {
  it("advance é reprodutível e o reset volta ao estado inicial", () => {
    const initial = stateFor()
    const first = demoReducer(initial, { type: "ADVANCE" })
    const second = demoReducer(initial, { type: "ADVANCE" })
    expect(second).toEqual(first)

    const reset = demoReducer(first, { type: "RESET" })
    expect(reset.ui.sim.tick).toBe(0)
    expect(reset.ui.sim.playing).toBe(false)
    expect(reset.ui.resetCount).toBe(initial.ui.resetCount + 1)
    expect(reset.ui.drafts).toEqual({})
  })

  it("não acumula reprodução além do total e não muda o objetivo ao enviar", () => {
    let state = stateFor("during-run")
    const before = state.sessions.find((session) => session.id === "sess-impl")!
    state = demoReducer(state, {
      type: "SEND_MESSAGE",
      sessionId: "sess-impl",
      content: "Também preserve o retorno anterior.",
      preference: "next-safe",
      sources: [],
    })
    const after = state.sessions.find((session) => session.id === "sess-impl")!
    expect(after.status).toBe(before.status)
    expect(after.messages.at(-1)?.deliveryState).toBe("admitted")
    expect(state.ui.drafts["sess-impl"]).toBe("")
    expect(state.ui.queue.filter((item) => item.state === "admitted")).toHaveLength(2)
  })

  it("distingue admissão, entrega e incorporação", () => {
    let state = stateFor("during-run")
    state = demoReducer(state, {
      type: "SEND_MESSAGE",
      sessionId: "sess-impl",
      content: "Mensagem em execução",
      preference: "next-safe",
      sources: [],
    })
    const queueId = state.ui.queue[0].id
    expect(state.ui.queue[0].state).toBe("admitted")

    state = demoReducer(state, { type: "ADVANCE" })
    expect(state.ui.queue.find((item) => item.id === queueId)?.state).toBe("delivered")

    state = demoReducer(state, { type: "ADVANCE" })
    expect(state.ui.queue.find((item) => item.id === queueId)?.state).toBe("incorporated")
    const message = state.sessions
      .find((session) => session.id === "sess-impl")!
      .messages.find((item) => item.id === state.ui.queue[0].messageId)
    expect(message?.deliveryState).toBe("incorporated")
  })

  it("respeita preferência de adiamento e mantém snapshot do texto", () => {
    let state = stateFor("during-run")
    state = demoReducer(state, {
      type: "SEND_MESSAGE",
      sessionId: "sess-impl",
      content: "Atualize a documentação depois",
      preference: "after-current",
      sources: [],
    })
    const queued = state.ui.queue.find((item) => item.content.includes("Atualize a documentação"))!
    const snapshot = queued.content
    state = demoReducer(state, { type: "SET_DRAFT", sessionId: "sess-impl", value: "outro texto" })
    expect(state.ui.queue.find((item) => item.id === queued.id)?.content).toBe(snapshot)
    state = demoReducer(state, { type: "ADVANCE" })
    state = demoReducer(state, { type: "ADVANCE" })
    expect(state.ui.queue.find((item) => item.id === queued.id)?.state).toBe("deferred")
  })

  it("interromper é ação separada e não descarta a fila", () => {
    let state = stateFor("during-run")
    state = demoReducer(state, {
      type: "SEND_MESSAGE",
      sessionId: "sess-impl",
      content: "Pedido pendente",
      preference: "next-safe",
      sources: [],
    })
    state = demoReducer(state, { type: "STOP_RUN", sessionId: "sess-impl" })
    const session = state.sessions.find((item) => item.id === "sess-impl")!
    expect(session.status).toBe("interrupted")
    expect(state.ui.queue.some((item) => item.messageId === "msg-queued-continuation")).toBe(true)
    expect(session.messages.at(-1)?.role).toBe("event")
  })

  it("setup falho não aparece como sessão pronta", () => {
    const state = stateFor("setup-failed")
    const worktree = state.worktrees.find((item) => item.id === "wt-login")!
    expect(worktree.status).toBe("setup_failed")
    expect(worktree.setup.state).toBe("failed")
    expect(worktree.setup.exitCode).toBe(1)
    expect(state.sessions.find((session) => session.id === "sess-impl")?.status).not.toBe("running")
  })

  it("argumentos incompletos nunca aparecem como executados", () => {
    const state = stateFor("during-run")
    const tool = state.sessions
      .find((session) => session.id === "sess-impl")!
      .messages.find((message) => message.id === "msg-generating-args")?.tool
    expect(tool?.argsComplete).toBe(false)
    expect(tool?.state).toBe("generating")
  })
})

describe("fila, gates e merge", () => {
  it("gates concluídos permitem solicitar merge; confirmação só após avanço; worktree permanece", () => {
    let state = stateFor()
    const pr = state.prs[0]
    expect(pr.gates.find((gate) => gate.id === "gate-tests")?.status).toBe("running")

    state = demoReducer(state, { type: "MERGE_PR", prId: pr.id, method: "squash" })
    expect(state.prs[0].mergeState).toBe("idle")

    state = demoReducer(state, { type: "ADVANCE" })
    state = demoReducer(state, { type: "ADVANCE" })
    expect(state.prs[0].gates.find((gate) => gate.id === "gate-tests")?.status).toBe("passed")

    state = demoReducer(state, { type: "MERGE_PR", prId: pr.id, method: "squash" })
    expect(state.prs[0].mergeState).toBe("queued")
    expect(state.prs[0].state).not.toBe("merged")

    state = demoReducer(state, { type: "ADVANCE" })
    expect(state.prs[0].mergeState).toBe("merged")
    const worktree = state.worktrees.find((item) => item.id === "wt-login")!
    expect(worktree.status).toBe("integrated")
    expect(state.worktrees.some((item) => item.id === "wt-login")).toBe(true)
    expect(state.sessions.some((session) => session.worktreeId === "wt-login")).toBe(true)
  })

  it("revisão desatualizada bloqueia merge mesmo após revalidar gate falho", () => {
    let state = stateFor("review-stale")
    expect(state.prs[0].reviewedSha).not.toBe(state.prs[0].sha)
    state = demoReducer(state, { type: "MERGE_PR", prId: state.prs[0].id, method: "squash" })
    expect(state.prs[0].mergeState).toBe("blocked")
    state = demoReducer(state, { type: "REVALIDATE_REVIEW", prId: state.prs[0].id })
    state = demoReducer(state, { type: "MERGE_PR", prId: state.prs[0].id, method: "squash" })
    expect(state.prs[0].mergeState).toBe("blocked")
  })

  it("remoção fictícia preserva sessões e evidências", () => {
    const initial = stateFor()
    const state = demoReducer(initial, { type: "REMOVE_WORKTREE", worktreeId: "wt-login" })
    expect(state.worktrees.find((item) => item.id === "wt-login")?.status).toBe("removed")
    expect(
      state.sessions.filter((session) => session.worktreeId === "wt-login").length,
    ).toBeGreaterThanOrEqual(3)
    expect(state.prs.some((pr) => pr.worktreeId === "wt-login")).toBe(true)
  })
})

describe("arquivos e conflito de versão", () => {
  it("save bloqueia quando o arquivo mudou e preserva o buffer humano", () => {
    let state = stateFor()
    const fileId = "file-login"
    state = demoReducer(state, { type: "OPEN_FILE_BUFFER", fileId })
    state = demoReducer(state, {
      type: "UPDATE_FILE_BUFFER",
      fileId,
      content: "buffer humano",
    })
    state = demoReducer(state, { type: "SIMULATE_EXTERNAL_CHANGE", fileId })
    const external = state.files.find((file) => file.id === fileId)!
    expect(external.version).toBe(8)
    expect(state.ui.fileBuffers[fileId].conflict).toBe(true)

    state = demoReducer(state, { type: "SAVE_FILE", fileId })
    expect(state.files.find((file) => file.id === fileId)?.content).toBe(external.content)
    expect(state.ui.fileBuffers[fileId].content).toBe("buffer humano")
    expect(state.ui.fileBuffers[fileId].conflict).toBe(true)
  })

  it("recarregar o disco resolve o conflito explicitamente", () => {
    let state = stateFor()
    const fileId = "file-login"
    state = demoReducer(state, { type: "OPEN_FILE_BUFFER", fileId })
    state = demoReducer(state, { type: "UPDATE_FILE_BUFFER", fileId, content: "meu buffer" })
    state = demoReducer(state, { type: "SIMULATE_EXTERNAL_CHANGE", fileId })
    state = demoReducer(state, { type: "RELOAD_FILE_BUFFER", fileId })
    expect(state.ui.fileBuffers[fileId].conflict).toBe(false)
    expect(state.ui.fileBuffers[fileId].content).toBe(
      state.files.find((file) => file.id === fileId)?.content,
    )
  })
})

describe("issues e busca", () => {
  it("resultado incerto de publicação preserva rascunho e não duplica comentário", () => {
    let state = stateFor("network")
    state = demoReducer(state, {
      type: "SET_ISSUE_DRAFT",
      issueId: "issue-142",
      value: "Comentário que pode ter sido publicado",
    })
    state = demoReducer(state, { type: "PUBLISH_ISSUE_COMMENT", issueId: "issue-142" })
    let issue = state.issues.find((item) => item.id === "issue-142")!
    expect(issue.publishState).toBe("uncertain")
    expect(issue.comments).toHaveLength(3)
    expect(state.ui.issueCommentDrafts["issue-142"]).toBeTruthy()

    state = demoReducer(state, { type: "VERIFY_ISSUE_PUBLISH", issueId: "issue-142" })
    issue = state.issues.find((item) => item.id === "issue-142")!
    expect(issue.comments).toHaveLength(4)
    expect(issue.publishState).toBe("confirmed")
    state = demoReducer(state, { type: "VERIFY_ISSUE_PUBLISH", issueId: "issue-142" })
    expect(state.issues.find((item) => item.id === "issue-142")?.comments).toHaveLength(4)
  })

  it("busca encontra trecho em checkout removido e filtra subagentes", () => {
    const state = stateFor()
    const withQuery: DemoState = {
      ...state,
      ui: { ...state.ui, search: { ...state.ui.search, query: "redirect após autenticação" } },
    }
    const results = searchHistory(withQuery)
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((result) => result.removedWorktree)).toBe(true)

    const noSubagents: DemoState = {
      ...state,
      ui: {
        ...state.ui,
        search: { ...state.ui.search, query: "revisão", includeSubagents: false },
      },
    }
    expect(searchHistory(noSubagents).every((result) => !result.subagent)).toBe(true)
  })

  it("modo literal diferencia maiúsculas e preserva consulta ao abrir resultado", () => {
    const state = stateFor()
    const literal: DemoState = {
      ...state,
      ui: {
        ...state.ui,
        search: { ...state.ui.search, query: "LoginRedirectTest", mode: "literal" },
      },
    }
    expect(searchHistory(literal).length).toBeGreaterThan(0)
    const wrongCase: DemoState = {
      ...literal,
      ui: { ...literal.ui, search: { ...literal.ui.search, query: "loginredirecttest" } },
    }
    expect(searchHistory(wrongCase)).toHaveLength(0)

    const opened = demoReducer(literal, {
      type: "OPEN_SEARCH_RESULT",
      resultId: searchHistory(literal)[0].id,
    })
    expect(opened.ui.search.query).toBe(literal.ui.search.query)
    expect(opened.ui.search.openedResultId).toBeTruthy()
  })

  it("adicionar trecho ao prompt é ação separada e preserva proveniência", () => {
    const state = stateFor()
    const withQuery: DemoState = {
      ...state,
      ui: { ...state.ui, search: { ...state.ui.search, query: "redirect" } },
    }
    const result = searchHistory(withQuery)[0]
    const next = demoReducer(withQuery, {
      type: "ADD_SEARCH_RESULT_TO_PROMPT",
      resultId: result.id,
      sessionId: "sess-impl",
    })
    expect(next.ui.search.query).toBe("redirect")
    expect(next.ui.drafts["sess-impl"]).toContain("Trecho do histórico")
    expect(next.ui.composerSources["sess-impl"]?.[0]?.kind).toBe("snippet")
  })
})
