import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "info" | "muted"

const worktreeMap: Record<string, { label: string; variant: BadgeVariant }> = {
  working: { label: "trabalhando", variant: "info" },
  review: { label: "em revisão", variant: "warning" },
  integrated: { label: "integrado · mantido", variant: "success" },
  setup_failed: { label: "setup falhou", variant: "danger" },
  removed: { label: "checkout removido", variant: "muted" },
}

const sessionMap: Record<string, { label: string; variant: BadgeVariant }> = {
  running: { label: "executando", variant: "info" },
  idle: { label: "ociosa", variant: "outline" },
  interrupted: { label: "interrompida", variant: "warning" },
  historical: { label: "histórico", variant: "muted" },
}

const jobMap: Record<string, { label: string; variant: BadgeVariant }> = {
  running: { label: "executando", variant: "info" },
  completed: { label: "concluído", variant: "success" },
  failed: { label: "falhou", variant: "danger" },
  cancel_requested: { label: "cancelamento solicitado", variant: "warning" },
  unknown: { label: "resultado desconhecido", variant: "muted" },
}

const toolMap: Record<string, { label: string; variant: BadgeVariant }> = {
  generating: { label: "gerando argumentos", variant: "warning" },
  awaiting_approval: { label: "aguarda aprovação", variant: "warning" },
  executing: { label: "executando", variant: "info" },
  succeeded: { label: "concluída", variant: "success" },
  failed: { label: "falhou", variant: "danger" },
  denied: { label: "recusada", variant: "muted" },
  unknown: { label: "resultado desconhecido", variant: "muted" },
}

const gateMap: Record<string, { label: string; variant: BadgeVariant }> = {
  passed: { label: "aprovado", variant: "success" },
  failed: { label: "falhou", variant: "danger" },
  running: { label: "em execução", variant: "info" },
  skipped: { label: "pulado", variant: "muted" },
  unknown: { label: "desconhecido", variant: "muted" },
  none: { label: "nenhum reportado", variant: "outline" },
}

const processMap: Record<string, { label: string; variant: BadgeVariant }> = {
  expected: { label: "esperado", variant: "success" },
  suspicious: { label: "resíduo suspeito", variant: "warning" },
  ended: { label: "encerrado no cenário", variant: "muted" },
  unknown: { label: "indisponível", variant: "outline" },
}

const mergeMap: Record<string, { label: string; variant: BadgeVariant }> = {
  idle: { label: "não solicitado", variant: "outline" },
  queued: { label: "solicitado · em fila", variant: "warning" },
  merged: { label: "integrado confirmado", variant: "success" },
  blocked: { label: "bloqueado", variant: "danger" },
  unavailable: { label: "consulta indisponível", variant: "muted" },
  failed: { label: "falhou", variant: "danger" },
}

const deliveryMap: Record<string, { label: string; variant: BadgeVariant }> = {
  admitted: { label: "admitida · ainda não entregue", variant: "warning" },
  delivered: { label: "entregue · aguardando incorporação", variant: "info" },
  incorporated: { label: "incorporada ao trabalho", variant: "success" },
  deferred: { label: "entregue · ação adiada", variant: "muted" },
}

const environmentMap: Record<string, { label: string; variant: BadgeVariant }> = {
  connected: { label: "conectado", variant: "success" },
  degraded: { label: "reconectando / degradado", variant: "warning" },
  offline: { label: "offline", variant: "danger" },
}

const maps = {
  worktree: worktreeMap,
  session: sessionMap,
  job: jobMap,
  tool: toolMap,
  gate: gateMap,
  process: processMap,
  merge: mergeMap,
  delivery: deliveryMap,
  environment: environmentMap,
}

export function StatusBadge({
  kind,
  value,
  className,
  dot = true,
}: {
  kind: keyof typeof maps
  value: string
  className?: string
  dot?: boolean
}) {
  const entry = maps[kind][value] ?? { label: value, variant: "outline" as BadgeVariant }
  return (
    <Badge variant={entry.variant} className={cn("gap-1.5", className)}>
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            entry.variant === "success" && "bg-green-600",
            entry.variant === "danger" && "bg-red-600",
            entry.variant === "warning" && "bg-amber-600",
            entry.variant === "info" && "bg-blue-600",
            (entry.variant === "outline" || entry.variant === "muted" || entry.variant === "secondary") &&
              "bg-slate-400",
          )}
        />
      )}
      {entry.label}
    </Badge>
  )
}

export function InfoRow({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2", className)}>
      <dt className="shrink-0 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  )
}

export function DemoOnly({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-amber-200 bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-amber-800 uppercase",
        className,
      )}
    >
      {children}
    </span>
  )
}
