export type ScenarioId =
  | "normal"
  | "setup-failed"
  | "during-run"
  | "approval"
  | "review-stale"
  | "network"

export type EnvironmentState = "connected" | "degraded" | "offline"
export type WorktreeStatus = "working" | "review" | "integrated" | "setup_failed" | "removed"
export type SessionStatus = "running" | "idle" | "interrupted" | "historical"
export type JobStatus =
  | "running"
  | "completed"
  | "failed"
  | "cancel_requested"
  | "unknown"
export type ToolState =
  | "generating"
  | "awaiting_approval"
  | "executing"
  | "succeeded"
  | "failed"
  | "denied"
  | "unknown"
export type GateStatus = "passed" | "failed" | "running" | "skipped" | "unknown" | "none"
export type MergeState =
  | "idle"
  | "queued"
  | "merged"
  | "blocked"
  | "unavailable"
  | "failed"
export type QueueState = "admitted" | "delivered" | "incorporated" | "deferred"
export type DeliveryPreference = "next-safe" | "after-current"

export interface Project {
  id: string
  name: string
  repo: string
  description: string
  baseBranch: string
  environment: string
  environmentState: EnvironmentState
  connection: string
  setupCommand: string
  integrationRite: "pr" | "local-push"
}

export interface SetupRun {
  state: "pending" | "running" | "succeeded" | "failed"
  exitCode: number | null
  output: string[]
  startedAt: string
}

export interface Worktree {
  id: string
  projectId: string
  name: string
  branch: string
  path: string
  issueId?: string
  status: WorktreeStatus
  setup: SetupRun
  lastActivity: string
  lastActivityLabel: string
  removedFromActive?: boolean
  integratedAt?: string
}

export interface SourceRef {
  id: string
  kind: "file" | "issue" | "snippet" | "person"
  label: string
  detail: string
  path?: string
  repo?: string
  issueNumber?: number
  version?: number
  error?: string
  content?: string
  provenance?: string
  mimeType?: string
  size?: number
  thumbnail?: string
}

export interface ToolApproval {
  decision: "allow" | "deny" | null
  scope: string
  risk: string
  requestedBy: string
  changed?: boolean
}

export interface ToolCall {
  id: string
  name: string
  args: string
  argsComplete: boolean
  state: ToolState
  scope: string
  output?: string
  startedAt: string
  approval?: ToolApproval
  jobId?: string
}

export interface Message {
  id: string
  sessionId: string
  role: "user" | "assistant" | "event" | "tool"
  content: string
  createdAt: string
  streaming?: boolean
  tool?: ToolCall
  jobId?: string
  sources?: SourceRef[]
  deliveryState?: QueueState
  deliveryPreference?: DeliveryPreference
  anchor?: string
}

export interface Session {
  id: string
  worktreeId: string
  title: string
  mode: string
  model: string
  effort: string
  status: SessionStatus
  updatedAt: string
  messages: Message[]
  parentSessionId?: string
  historicalNote?: string
}

export interface Comment {
  id: string
  author: string
  body: string
  createdAt: string
}

export interface Issue {
  id: string
  projectId: string
  repo: string
  number: number
  title: string
  body: string
  state: "open" | "closed"
  labels: string[]
  author: string
  updatedAt: string
  comments: Comment[]
  editing?: boolean
  publishState?: "idle" | "uncertain" | "confirmed" | "error"
}

export interface DiffLine {
  type: "add" | "remove" | "context"
  text: string
}

export interface DiffHunk {
  header: string
  lines: DiffLine[]
}

export interface DemoFile {
  id: string
  worktreeId: string
  path: string
  language: "php" | "typescript" | "markdown" | "json" | "text"
  content: string
  version: number
  status: "modified" | "added" | "unchanged"
  binary?: boolean
  size?: number
  unavailable?: boolean
  diff: DiffHunk[]
}

export interface FileBuffer {
  content: string
  baseVersion: number
  dirty: boolean
  conflict: boolean
  externalContent?: string
  externalVersion?: number
}

export interface Job {
  id: string
  worktreeId: string
  sessionId: string
  name: string
  kind: "tool" | "subagent"
  status: JobStatus
  objective: string
  lastActivity: string
  startedAt: string
  childSessionId?: string
  output: string
  progressNote?: string
  toolCallId?: string
  cancellationNote?: string
}

export interface Gate {
  id: string
  name: string
  status: GateStatus
  required: boolean
  source: string
  sha: string
  detail: string
}

export interface PullRequest {
  id: string
  worktreeId: string
  number: number
  title: string
  head: string
  base: string
  sha: string
  reviewedSha: string
  state: "open" | "blocked" | "merged" | "unavailable"
  gatesState: "reported" | "none" | "unavailable"
  gates: Gate[]
  mergeMethods: Array<"merge" | "squash">
  mergeState: MergeState
  mergeMethod?: "merge" | "squash"
  mergeRequestedAt?: string
  updatedAt: string
  note?: string
}

export interface ProcessGroup {
  id: string
  worktreeId: string
  origin: string
  kind: "preview" | "browser" | "shell" | "worker" | "external"
  status: "expected" | "suspicious" | "ended" | "unknown"
  cpu: number | null
  memory: number | null
  command: string
  since: string
  reason?: string
  scope: string
  attribution: "confirmed" | "best-effort"
  children?: string[]
}

export interface TerminalSession {
  id: string
  worktreeId: string
  title: string
  status: "connected" | "reconnecting" | "ended"
  stateLabel: string
  output: string[]
  truncated: boolean
}

export interface Preview {
  id: string
  worktreeId: string
  title: string
  status: "ready" | "revoked" | "offline" | "iframe_blocked"
  access: "harness" | "private" | "public"
  url: string
  detail: string
}

export interface QuotaWindow {
  id: string
  label: string
  used: number | null
  remaining: number | null
  resetAt: string | null
  source: string
  readAt: string | null
}

export interface Connection {
  id: string
  name: string
  provider: string
  plan: string
  holder: string
  keyState: string
  catalogState: string
  extraUsage: "unknown" | "configured" | "not-applicable"
  extraUsageNote: string
  sessionUsage: { input: number | null; output: number | null; cache: number | null }
  context: { used: number | null; limit: number | null }
  quotaWindows: QuotaWindow[]
}

export interface ModeConfig {
  id: string
  name: string
  description: string
  tools: string
  permission: string
}

export interface McpConfig {
  id: string
  name: string
  target: string
  status: "connected" | "unavailable" | "disabled"
  tools: number | null
  note: string
}

export interface SettingsState {
  modes: ModeConfig[]
  mcp: McpConfig[]
  permissionProfile: string
  contextPolicy: string
  retention: string
  access: {
    sessions: Array<{
      id: string
      device: string
      trust: "trusted" | "untrusted" | "expired"
      lastSeen: string
      expires: string
    }>
  }
}

export interface QueueItem {
  id: string
  sessionId: string
  messageId: string
  content: string
  sources: SourceRef[]
  admittedAt: string
  state: QueueState
  preference: DeliveryPreference
  note?: string
}

export interface SearchState {
  query: string
  mode: "terms" | "phrase" | "literal"
  scope: "all" | "project" | "worktree"
  projectId: string | null
  worktreeId: string | null
  includeSubagents: boolean
  openedResultId: string | null
}

export interface IssueOverlayState {
  open: boolean
  issueId: string | null
  mobileView: "list" | "detail"
  triggerLabel: string | null
}

export interface SimulationState {
  tick: number
  playing: boolean
  totalTicks: number
}

export interface DemoUiState {
  scenario: ScenarioId
  sim: SimulationState
  drafts: Record<string, string>
  composerSources: Record<string, SourceRef[]>
  queue: QueueItem[]
  issueOverlay: IssueOverlayState
  issueCommentDrafts: Record<string, string>
  fileBuffers: Record<string, FileBuffer>
  activeSessionByWorktree: Record<string, string>
  selectedFileByWorktree: Record<string, string>
  search: SearchState
  lastStreamChunk: Record<string, number>
  assistantStream: string
  terminalTick: number
  resetCount: number
}

export interface DemoState {
  projects: Project[]
  worktrees: Worktree[]
  sessions: Session[]
  issues: Issue[]
  files: DemoFile[]
  jobs: Job[]
  prs: PullRequest[]
  processes: ProcessGroup[]
  terminals: TerminalSession[]
  previews: Preview[]
  connections: Connection[]
  settings: SettingsState
  ui: DemoUiState
}

export interface SearchResult {
  id: string
  projectId: string
  worktreeId: string
  sessionId: string
  messageId: string
  kind: "message" | "tool" | "job" | "file" | "issue"
  title: string
  snippet: string
  matchStart: number
  matchLength: number
  createdAt: string
  removedWorktree: boolean
  subagent: boolean
  anchor: string
}

export interface Scenario {
  id: ScenarioId
  name: string
  description: string
  focus: string
}
