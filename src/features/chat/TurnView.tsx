import * as React from "react"
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Copy,
  FileSearch,
  GitCompare,
  Info,
  LoaderCircle,
  ShieldAlert,
  Terminal,
  Wrench,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { MarkdownView } from "@/components/markdown/MarkdownView"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CodeBlock,
  CodeBlockContent,
} from "@/components/ui/code-block"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Message, MessageContent, MessageFooter } from "@/components/ui/message"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import { useDemo } from "@/demo/DemoProvider"
import { getChildSession } from "@/demo/selectors"
import type { Job, Message as DemoMessage, ToolCall } from "@/demo/types"
import type { ChatTurn } from "./build-chat-turns"
import { formatDateTime } from "@/lib/utils"
import { JobDetailDialog } from "./ChatParts"
import { SourceList } from "./SourceAttachment"

function parseArgs(args: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(args) as unknown
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function toolCommand(tool: ToolCall): string {
  const parsed = parseArgs(tool.args)
  if (parsed && typeof parsed.command === "string") return parsed.command
  if (parsed && typeof parsed.path === "string") return parsed.path
  return tool.name
}

function toolStatus(tool: ToolCall): {
  label: string
  icon: React.ReactNode
  status?: "running" | "error" | "pending"
} {
  switch (tool.state) {
    case "succeeded":
      return { label: "concluído", icon: <CheckCircle2 /> }
    case "executing":
      return { label: "executando", icon: <LoaderCircle className="animate-spin" />, status: "running" }
    case "failed":
      return { label: "falhou", icon: <XCircle />, status: "error" }
    case "denied":
      return { label: "recusada", icon: <Ban /> }
    case "generating":
      return { label: "em geração", icon: <CircleDashed />, status: "pending" }
    case "awaiting_approval":
      return { label: "aguardando aprovação", icon: <ShieldAlert />, status: "pending" }
    default:
      return { label: "resultado desconhecido", icon: <AlertCircle />, status: "error" }
  }
}

function ToolIcon({ tool }: { tool: ToolCall }) {
  if (tool.name === "shell") return <Terminal />
  if (tool.name === "read_file") return <FileSearch />
  return <Wrench />
}

function ToolLine({ tool, label }: { tool: ToolCall; label: string }) {
  const [jobOpen, setJobOpen] = React.useState(false)
  const { state } = useDemo()
  const job = tool.jobId ? state.jobs.find((item) => item.id === tool.jobId) : null
  const status = toolStatus(tool)
  const command = !tool.argsComplete ? label : toolCommand(tool)
  const parsed = parseArgs(tool.args)
  const canExpand = Boolean(tool.args || tool.output)

  const line = (
    <TraceLine status={status.status}>
      <TraceIcon>
        <ToolIcon tool={tool} />
      </TraceIcon>
      <TraceTitle title={command}>{command}</TraceTitle>
      <TraceDescription>{status.label}</TraceDescription>
      <TraceIcon className="ms-0.5">{status.icon}</TraceIcon>
    </TraceLine>
  )

  if (!canExpand) return line

  return (
    <>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="flex flex-col gap-2">
          {!tool.argsComplete ? (
            <>
              <p className="text-xs text-amber-800">
                Argumentos ainda em geração. A chamada não foi executada.
              </p>
              <CodeBlock size="sm">
                <CodeBlockContent wrap>{tool.args}</CodeBlockContent>
              </CodeBlock>
            </>
          ) : (
            <CodeBlock size="sm">
              {parsed && typeof parsed.command === "string" ? (
                <CodeBlockContent wrap>{String(parsed.command)}</CodeBlockContent>
              ) : (
                <CodeBlockContent wrap>{tool.args}</CodeBlockContent>
              )}
            </CodeBlock>
          )}
          {tool.output && (
            <CodeBlock size="sm" variant={tool.state === "failed" ? "destructive" : "default"}>
              <CodeBlockContent wrap className="max-h-64">
                {tool.output}
              </CodeBlockContent>
            </CodeBlock>
          )}
          {job && (
            <div>
              <Button size="xs" variant="ghost" onClick={() => setJobOpen(true)}>
                Abrir job
              </Button>
            </div>
          )}
        </TraceCollapsibleContent>
      </TraceCollapsible>
      {job && (
        <JobDetailDialog
          job={job}
          open={jobOpen}
          onOpenChange={setJobOpen}
          sessionTitle={job.sessionId === "sess-impl" ? "Implementação" : job.sessionId}
        />
      )}
    </>
  )
}

function SubagentLine({ job }: { job: Job }) {
  const { state } = useDemo()
  const child = getChildSession(state, job)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const running = job.status === "running"
  const failed = job.status === "failed" || job.status === "unknown"
  const childTools = child?.messages.filter((message) => message.tool) ?? []

  return (
    <>
      <TraceCollapsible defaultOpen={running}>
        <TraceCollapsibleTrigger>
          <TraceLine status={running ? "running" : failed ? "error" : undefined}>
            <TraceIcon>
              {running ? (
                <LoaderCircle className="animate-spin" />
              ) : failed ? (
                <AlertCircle />
              ) : (
                <CheckCircle2 />
              )}
            </TraceIcon>
            <TraceTitle>
              {running
                ? "Subagente de revisão em execução"
                : failed
                  ? "Subagente de revisão sem confirmação"
                  : "Subagente de revisão concluiu"}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="font-mono">
              {child?.model ?? "modelo do cenário"}
            </Badge>
            <Badge variant="outline">subagente</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{job.objective}</p>
          {childTools.length > 0 && (
            <Trace>
              {childTools.map((message) =>
                message.tool ? (
                  <TraceLine key={message.id}>
                    <TraceIcon>
                      <ToolIcon tool={message.tool} />
                    </TraceIcon>
                    <TraceTitle>{toolCommand(message.tool)}</TraceTitle>
                    <TraceDescription>lido</TraceDescription>
                  </TraceLine>
                ) : null,
              )}
            </Trace>
          )}
          <p className="text-xs text-foreground/85">{job.output}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="xs" variant="ghost" onClick={() => setDetailOpen(true)}>
              Ver sessão filha
            </Button>
            <span className="text-[11px] text-muted-foreground">
              contexto próprio, fora do prompt atual
            </span>
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
      <JobDetailDialog
        job={job}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        sessionTitle="Implementação"
      />
    </>
  )
}

function ApprovalItem({ tool }: { tool: ToolCall }) {
  const { dispatch } = useDemo()
  const command = toolCommand(tool)
  return (
    <Item variant="outline" size="sm" className="my-1 border-amber-200 bg-amber-50/50">
      <ItemMedia variant="icon" className="border-amber-200 bg-card text-amber-800">
        <ShieldAlert />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Executar {command}?</ItemTitle>
        <ItemDescription>
          {tool.approval?.risk ?? "Ação sensível"} · {tool.scope}
        </ItemDescription>
        <details className="mt-1">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Ver argumentos
          </summary>
          <CodeBlock size="sm" className="mt-1.5">
            <CodeBlockContent wrap>{tool.args}</CodeBlockContent>
          </CodeBlock>
        </details>
      </ItemContent>
      <ItemActions>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: "CONFIRM_APPROVAL", toolId: tool.id, decision: "deny" })}
        >
          Recusar
        </Button>
        <Button
          size="sm"
          onClick={() => dispatch({ type: "CONFIRM_APPROVAL", toolId: tool.id, decision: "allow" })}
        >
          Permitir
        </Button>
      </ItemActions>
    </Item>
  )
}

function EventLine({ message }: { message: DemoMessage }) {
  return (
    <TraceLine className="py-0.5 text-xs">
      <TraceIcon>
        <Info />
      </TraceIcon>
      <TraceTitle className="whitespace-normal">{message.content}</TraceTitle>
    </TraceLine>
  )
}

function TurnFooter({
  reply,
  createdAt,
  onOpenDiff,
}: {
  reply: string
  createdAt: string
  onOpenDiff?: () => void
}) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(timeout)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(reply)
      setCopied(true)
    } catch {
      toast.error("Não foi possível copiar a resposta neste navegador.")
    }
  }

  return (
    <MessageFooter className="mt-1 gap-1">
      <Button
        size="icon-sm"
        variant="ghost"
        className="size-7 text-muted-foreground"
        onClick={copy}
        aria-label={copied ? "Resposta copiada" : "Copiar resposta"}
        title={copied ? "Copiado" : "Copiar resposta"}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
      {onOpenDiff && (
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-7 text-muted-foreground"
          onClick={onOpenDiff}
          aria-label="Ver diff da alteração"
          title="Ver diff da alteração"
        >
          <GitCompare />
        </Button>
      )}
      <time className="ms-1 text-[11px] text-muted-foreground" dateTime={createdAt}>
        {formatDateTime(createdAt)}
      </time>
    </MessageFooter>
  )
}

function UserTurn({ message }: { message: DemoMessage }) {
  const delivery =
    message.deliveryState === "admitted"
      ? "Na fila"
      : message.deliveryState === "delivered"
        ? "Entregue"
        : message.deliveryState === "deferred"
          ? "Ação adiada"
          : null

  return (
    <Message align="end" className="pt-1">
      <MessageContent className="items-end gap-2">
        <Bubble align="end" variant="muted">
          <BubbleContent className="text-[13.5px]">
            <MarkdownView content={message.content} className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0" />
          </BubbleContent>
        </Bubble>
        {message.sources && message.sources.length > 0 && (
          <SourceList sources={message.sources} align="end" compact />
        )}
        <MessageFooter className="mt-0 justify-end gap-1.5">
          {delivery && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock3 className="size-3" /> {delivery}
            </span>
          )}
          <time className="text-[11px] text-muted-foreground" dateTime={message.createdAt}>
            {formatDateTime(message.createdAt)}
          </time>
        </MessageFooter>
      </MessageContent>
    </Message>
  )
}

export function TurnView({
  turn,
  jobs,
  onOpenDiff,
  highlighted,
}: {
  turn: ChatTurn
  jobs: Job[]
  onOpenDiff?: () => void
  highlighted: boolean
}) {
  const assistantMessages = turn.items.filter((item) => item.role === "assistant")
  const reply = assistantMessages.map((message) => message.content).join("\n\n")
  const lastAssistant = assistantMessages.at(-1)
  const streaming = assistantMessages.some((message) => message.streaming)
  const groups: React.ReactNode[] = []
  let toolBuffer: Array<{ tool: ToolCall; label: string }> = []

  function flushTools() {
    if (toolBuffer.length === 0) return
    groups.push(
      <Trace key={`trace-${turn.id}-${groups.length}`}>
        {toolBuffer.map((entry) => (
          <ToolLine key={entry.tool.id} tool={entry.tool} label={entry.label} />
        ))}
      </Trace>,
    )
    toolBuffer = []
  }

  for (const item of turn.items) {
    if (item.role === "tool" && item.tool) {
      const tool = item.tool
      const job = tool.jobId ? jobs.find((entry) => entry.id === tool.jobId) : null
      if (tool.state === "awaiting_approval" && tool.approval?.decision === null) {
        flushTools()
        groups.push(<ApprovalItem key={tool.id} tool={tool} />)
        continue
      }
      if (tool.name === "subagent" && job) {
        flushTools()
        groups.push(<SubagentLine key={job.id} job={job} />)
        continue
      }
      toolBuffer.push({ tool, label: item.content })
      continue
    }
    if (item.role === "assistant") {
      flushTools()
      groups.push(
        <div key={item.id} className="flex flex-col gap-1.5">
          <MarkdownView content={item.content} />
          {item.streaming && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              Respondendo…
            </span>
          )}
        </div>,
      )
      continue
    }
    if (item.role === "event") {
      flushTools()
      groups.push(<EventLine key={item.id} message={item} />)
    }
  }
  flushTools()

  return (
    <div
      className={
        highlighted
          ? "rounded-2xl ring-2 ring-amber-300/80 ring-offset-4 ring-offset-background"
          : undefined
      }
      data-turn-id={turn.id}
    >
      {turn.user && <UserTurn message={turn.user} />}
      {turn.items.length > 0 && (
        <Message className="mt-4">
          <MessageContent className="gap-3">
            {groups}
            {reply && !streaming && (
              <TurnFooter
                reply={reply}
                createdAt={lastAssistant?.createdAt ?? turn.id}
                onOpenDiff={onOpenDiff}
              />
            )}
          </MessageContent>
        </Message>
      )}
    </div>
  )
}
