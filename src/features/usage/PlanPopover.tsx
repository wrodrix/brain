import { Bot, Brain, Sparkles } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/surface"
import type { Connection, QuotaWindow } from "@/demo/types"
import { cn } from "@/lib/utils"

export function ProviderMark({
  provider,
  className,
}: {
  provider: string
  className?: string
}) {
  const config = provider.includes("Go")
    ? { icon: Brain, className: "bg-teal-700 text-white" }
    : provider.includes("Z.AI")
      ? { icon: Sparkles, className: "bg-violet-700 text-white" }
      : { icon: Bot, className: "bg-slate-700 text-white" }
  const Icon = config.icon
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-card ring-1 ring-black/5",
        config.className,
        className,
      )}
    >
      <Icon className="size-3" />
    </span>
  )
}

function findWindow(connection: Connection, id: string): QuotaWindow | null {
  return connection.quotaWindows.find((window) => window.id === id) ?? null
}

function percentage(window: QuotaWindow | null) {
  return window?.used ?? null
}

function resetText(window: QuotaWindow | null) {
  if (!window?.resetAt || !window.readAt) return "não disponível"
  const diff = new Date(window.resetAt).getTime() - new Date(window.readAt).getTime()
  if (!Number.isFinite(diff) || diff <= 0) return "não informado"
  const minutes = Math.round(diff / 60_000)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`
}

export function PlanPopover({
  connections,
  triggerClassName,
}: {
  connections: Connection[]
  triggerClassName?: string
}) {
  const primary = connections[0]
  const primaryFiveHour = primary ? findWindow(primary, "q-5h") : null
  const used = percentage(primaryFiveHour)

  if (!primary) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-6 items-center gap-1.5 rounded px-1.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            triggerClassName,
          )}
          title="Abrir detalhes dos planos conectados"
        >
          <span className="flex -space-x-1.5">
            {connections.map((connection) => (
              <ProviderMark key={connection.id} provider={connection.provider} />
            ))}
          </span>
          <span>Plano</span>
          <span
            aria-hidden="true"
            className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200"
          >
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${used ?? 0}%` }}
            />
          </span>
          <span className="font-mono text-[10px]">{used === null ? "—" : `${used}%`}</span>
          <span className="sr-only">Abrir detalhes dos planos conectados</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="border-b px-3 py-2">
          <p className="text-xs font-semibold">Planos conectados</p>
          <p className="text-[10px] text-muted-foreground">
            Dados fictícios do cenário · sem consulta ao provedor.
          </p>
        </div>
        <div className="divide-y">
          {connections.map((connection) => {
            const five = findWindow(connection, "q-5h")
            const week = findWindow(connection, "q-week")
            const month = findWindow(connection, "q-month")
            return (
              <section key={connection.id} className="p-3">
                <div className="flex items-center gap-2">
                  <ProviderMark provider={connection.provider} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{connection.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {connection.provider} · {connection.plan}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-700">
                    <span className="size-1.5 rounded-full bg-green-600" />
                    conectado
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_72px] gap-2">
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] font-medium">Janela de 5h</span>
                      <span className="font-mono text-[11px]">
                        {five?.used === null || five?.used === undefined ? "—" : `${five.used}%`}
                      </span>
                    </div>
                    <Progress
                      value={five?.used ?? null}
                      className="mt-1 h-1.5"
                      label={`Uso da janela de 5 horas de ${connection.name}`}
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      reset em {resetText(five)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-slate-50 px-2 py-1 text-right">
                    <p className="text-[9px] tracking-wide text-muted-foreground uppercase">
                      Semanal
                    </p>
                    <p className="font-mono text-sm font-semibold">
                      {week?.used === null || week?.used === undefined ? "—" : `${week.used}%`}
                    </p>
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Mensal:{" "}
                  {month?.used === null || month?.used === undefined
                    ? "não disponível"
                    : `${month.used}%`}
                </p>
              </section>
            )
          })}
        </div>
        <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
          O progresso principal cobre a janela de 5h. Percentuais ausentes não são convertidos em
          zero.
        </div>
      </PopoverContent>
    </Popover>
  )
}
