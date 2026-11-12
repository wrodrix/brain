import { describe, expect, it } from "vitest"

import { createInitialState } from "./fixtures"
import {
  buildFileTree,
  fileSizeLabel,
  getIssueForWorktree,
  getSessionsForWorktree,
  getWorktreesForProject,
  isLargeFile,
  mentionOptions,
  searchHistory,
} from "./selectors"

describe("identidade dos recursos", () => {
  it("mantém projeto, worktree e sessão identificados entre telas", () => {
    const state = createInitialState()
    const worktree = state.worktrees.find((item) => item.id === "wt-login")!
    const project = state.projects.find((item) => item.id === worktree.projectId)!
    const sessions = getSessionsForWorktree(state, worktree.id)
    expect(project.repo).toBe("equipe/atlas")
    expect(worktree.branch).toBe("issue-142-login")
    expect(sessions.map((session) => session.id)).toContain("sess-impl")
    expect(getIssueForWorktree(state, worktree)?.number).toBe(142)
  })

  it("não mistura worktree removido com a árvore ativa", () => {
    const state = createInitialState()
    expect(getWorktreesForProject(state, "atlas").some((item) => item.status === "removed")).toBe(false)
    expect(
      getWorktreesForProject(state, "atlas", true).some((item) => item.status === "removed"),
    ).toBe(true)
  })

  it("normaliza nome de arquivo e mostra indisponibilidade", () => {
    const state = createInitialState()
    const options = mentionOptions(state, "wt-login")
    const unavailable = options.files.find((item) => item.source.path === "config/legacy-auth.php")
    expect(unavailable?.error).toBeTruthy()
    const binary = options.files.find((item) => item.source.path === "public/logo.png")
    expect(binary?.error).toContain("binário")
    expect(options.files.every((item) => item.source.version !== undefined)).toBe(true)
  })

  it("constrói árvore por diretório e identifica binário/grande", () => {
    const state = createInitialState()
    const files = state.files.filter((file) => file.worktreeId === "wt-login")
    const tree = buildFileTree(files)
    expect(tree.some((node) => node.name === "app")).toBe(true)
    const logo = files.find((file) => file.path === "public/logo.png")!
    const dump = files.find((file) => file.path === "storage/exports/session-dump.json")!
    expect(fileSizeLabel(logo)).toContain("kB")
    expect(isLargeFile(dump)).toBe(true)
    expect(isLargeFile(logo)).toBe(false)
  })
})

describe("busca de histórico", () => {
  it("não retorna nada para consulta vazia", () => {
    expect(searchHistory(createInitialState())).toEqual([])
  })

  it("encontra path e snippet com posição de destaque", () => {
    const state = createInitialState()
    const next = {
      ...state,
      ui: {
        ...state.ui,
        search: { ...state.ui.search, query: "LoginController.php", mode: "literal" as const },
      },
    }
    const results = searchHistory(next)
    expect(results.some((result) => result.kind === "file")).toBe(true)
    expect(results[0].matchLength).toBeGreaterThan(0)
  })

  it("respeita escopo por worktree", () => {
    const state = createInitialState()
    const next = {
      ...state,
      ui: {
        ...state.ui,
        search: {
          ...state.ui.search,
          query: "redirect",
          scope: "worktree" as const,
          worktreeId: "wt-investigation",
        },
      },
    }
    expect(searchHistory(next).every((result) => result.worktreeId === "wt-investigation")).toBe(true)
  })
})
