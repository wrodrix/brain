import { buildSearchIndex, sourceForFile } from "./fixtures"
import type {
  DemoFile,
  DemoState,
  Issue,
  Job,
  Project,
  SearchResult,
  Session,
  SourceRef,
  Worktree,
} from "./types"

export function getProject(state: DemoState, projectId: string | null | undefined): Project | null {
  if (!projectId) return null
  return state.projects.find((project) => project.id === projectId) ?? null
}

export function getWorktree(
  state: DemoState,
  worktreeId: string | null | undefined,
): Worktree | null {
  if (!worktreeId) return null
  return state.worktrees.find((worktree) => worktree.id === worktreeId) ?? null
}

export function getWorktreesForProject(
  state: DemoState,
  projectId: string,
  includeRemoved = false,
): Worktree[] {
  return state.worktrees.filter(
    (worktree) =>
      worktree.projectId === projectId && (includeRemoved || worktree.status !== "removed"),
  )
}

export function getSessionsForWorktree(state: DemoState, worktreeId: string): Session[] {
  return state.sessions.filter((session) => session.worktreeId === worktreeId)
}

export function getSession(state: DemoState, sessionId: string | null | undefined): Session | null {
  if (!sessionId) return null
  return state.sessions.find((session) => session.id === sessionId) ?? null
}

export function getActiveSession(state: DemoState, worktreeId: string): Session | null {
  const id = state.ui.activeSessionByWorktree[worktreeId]
  const session = getSession(state, id)
  if (session) return session
  return getSessionsForWorktree(state, worktreeId)[0] ?? null
}

export function getIssue(state: DemoState, issueId: string): Issue | null {
  return state.issues.find((issue) => issue.id === issueId) ?? null
}

export function getIssuesForProject(state: DemoState, projectId: string): Issue[] {
  return state.issues.filter((issue) => issue.projectId === projectId)
}

export function getIssueForWorktree(state: DemoState, worktree: Worktree): Issue | null {
  if (!worktree.issueId) return null
  return getIssue(state, worktree.issueId)
}

export function getFilesForWorktree(state: DemoState, worktreeId: string): DemoFile[] {
  return state.files.filter((file) => file.worktreeId === worktreeId)
}

export function getJobsForWorktree(state: DemoState, worktreeId: string): Job[] {
  return state.jobs.filter((job) => job.worktreeId === worktreeId)
}

export function getJobsForSession(state: DemoState, sessionId: string): Job[] {
  return state.jobs.filter((job) => job.sessionId === sessionId)
}

export function getChildSession(state: DemoState, job: Job): Session | null {
  if (!job.childSessionId) return null
  return getSession(state, job.childSessionId)
}

export function fileSizeLabel(file: DemoFile): string {
  if (!file.size) return "tamanho não disponível"
  if (file.size >= 1_000_000) return `${(file.size / 1_000_000).toFixed(1)} MB`
  if (file.size >= 1_000) return `${(file.size / 1_000).toFixed(1)} kB`
  return `${file.size} B`
}

export function isLargeFile(file: DemoFile): boolean {
  return (file.size ?? 0) > 1_000_000
}

export interface TreeNode {
  name: string
  path: string
  children: TreeNode[]
  file?: DemoFile
}

export function buildFileTree(files: DemoFile[]): TreeNode[] {
  const root: TreeNode[] = []
  for (const file of files) {
    const parts = file.path.split("/")
    let level = root
    let path = ""
    parts.forEach((part, index) => {
      path = path ? `${path}/${part}` : part
      let node = level.find((item) => item.name === part)
      if (!node) {
        node = { name: part, path, children: [] }
        level.push(node)
      }
      if (index === parts.length - 1) node.file = file
      level = node.children
    })
  }
  return root
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function snippetAround(text: string, query: string, literal: boolean) {
  const haystack = literal ? text : text.toLowerCase()
  const needle = literal ? query : query.toLowerCase()
  const index = haystack.indexOf(needle)
  if (index < 0) return null
  const start = Math.max(0, index - 70)
  const end = Math.min(text.length, index + query.length + 110)
  return {
    snippet: `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`,
    matchStart: index - start + (start > 0 ? 1 : 0),
    matchLength: query.length,
  }
}

export function searchHistory(state: DemoState): SearchResult[] {
  const { query, mode, scope, projectId, worktreeId, includeSubagents } = state.ui.search
  const trimmed = query.trim()
  if (!trimmed) return []

  const index = buildSearchIndex(state)
  const filtered = index.filter((result) => {
    if (scope === "project" && projectId && result.projectId !== projectId) return false
    if (scope === "worktree" && worktreeId && result.worktreeId !== worktreeId) return false
    if (!includeSubagents && result.subagent) return false
    return true
  })

  const results: SearchResult[] = []
  for (const result of filtered) {
    const fullText = `${result.title}\n${result.snippet}`
    let matches = false
    if (mode === "literal") {
      matches = fullText.includes(trimmed)
    } else if (mode === "phrase") {
      matches = normalize(fullText).includes(normalize(trimmed))
    } else {
      const terms = normalize(trimmed).split(/\s+/).filter(Boolean)
      matches = terms.every((term) => normalize(fullText).includes(term))
    }
    if (!matches) continue

    const locateQuery = mode === "literal" ? trimmed : trimmed.split(/\s+/)[0]
    const located = snippetAround(fullText, locateQuery, mode === "literal")
    results.push({
      ...result,
      title: result.title,
      ...(located ?? { snippet: fullText.slice(0, 200), matchStart: 0, matchLength: 0 }),
    })
  }

  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function mentionOptions(state: DemoState, worktreeId: string) {
  const worktree = getWorktree(state, worktreeId)
  if (!worktree) {
    return { files: [] as Array<{ source: SourceRef; error?: string }>, issues: [] as SourceRef[], people: [] as SourceRef[] }
  }
  const files = getFilesForWorktree(state, worktreeId).map((file) => {
    const source = sourceForFile(file)
    return { source, error: source.error }
  })
  const issues = getIssuesForProject(state, worktree.projectId).map((issue) => ({
    id: `src-issue-${issue.id}`,
    kind: "issue" as const,
    label: `${issue.repo}#${issue.number}`,
    detail: `${issue.title} · ${issue.state === "open" ? "aberta" : "encerrada"}`,
    repo: issue.repo,
    issueNumber: issue.number,
    provenance: `Descrição + ${issue.comments.length}/${issue.comments.length} comentários carregados`,
    content: issue.body,
  }))
  const people = [
    {
      id: "src-person-marina",
      kind: "person" as const,
      label: "Marina Duarte",
      detail: "Autora da issue · sem notificação ou transferência",
      provenance: "Identidade fictícia. Citar não concede acesso nem handover.",
      content: "Marina Duarte — identidade de demonstração.",
    },
    {
      id: "src-person-rafael",
      kind: "person" as const,
      label: "Rafael Nunes",
      detail: "Revisor · identidade fictícia",
      provenance: "Identidade fictícia. Citar não notifica.",
      content: "Rafael Nunes — identidade de demonstração.",
    },
  ]
  return { files, issues, people }
}

export function searchTargetLabel(state: DemoState): string {
  const { scope, projectId, worktreeId } = state.ui.search
  if (scope === "project") return getProject(state, projectId)?.name ?? "projeto não escolhido"
  if (scope === "worktree") {
    return getWorktree(state, worktreeId)?.name ?? "worktree não escolhido"
  }
  return "todo o histórico acessível"
}
