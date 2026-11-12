import { Coins, Database } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/surface"
import type { Connection } from "@/demo/types"

const number = new Intl.NumberFormat("pt-BR")

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md border bg-card p-1.5">
      <p className="text-[9px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-mono text-[11px] font-semibold">{value === null ? "—" : number.format(value)}</p>
    </div>
  )
}

export function ContextPopover({ connection }: { connection: Connection }) {
  const { context, sessionUsage } = connection
  const percent =
    context.used !== null && context.limit
      ? Math.round((context.used / context.limit) * 100)
      : null
  if (percent === null) return null
  const label = `Contexto: ${number.format(context.used ?? 0)} de ${number.format(context.limit ?? 0)} tokens (${percent}%)`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="flex h-7 items-center gap-1 rounded-md px-1 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="relative size-4 rounded-full"
            style={{
              background: `conic-gradient(var(--primary) ${percent * 3.6}deg, #e2e8f0 0)`,
            }}
          >
            <span className="absolute inset-[3px] rounded-full bg-card" />
          </span>
          <span className="font-mono">{percent}%</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-xs font-semibold">Janela de contexto</p>
          <p className="text-[10px] text-muted-foreground">
            {connection.name} · dados fictícios do cenário.
          </p>
        </div>
        <div className="space-y-2 p-3">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-medium">Uso</span>
              <span className="font-mono text-[11px]">{percent}%</span>
            </div>
            <Progress
              value={percent}
              className="mt-1"
              label={`Uso da janela de contexto de ${connection.name}`}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {number.format(context.used ?? 0)} de {number.format(context.limit ?? 0)} tokens
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Metric label="Entrada" value={sessionUsage.input} />
            <Metric label="Saída" value={sessionUsage.output} />
            <Metric label="Cache" value={sessionUsage.cache} />
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-slate-50 p-2">
            <Coins className="size-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium">Custo</p>
              <p className="text-[9px] text-muted-foreground">Não informado pelo provedor neste demo.</p>
            </div>
            <span className="font-mono text-[11px] font-semibold text-muted-foreground">—</span>
          </div>
          <p className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <Database className="size-3" /> Contagem local da fixture; sem consulta real.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
