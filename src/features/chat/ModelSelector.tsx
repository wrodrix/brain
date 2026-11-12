import { Brain, Check, ChevronDown, Sparkles } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDemo } from "@/demo/DemoProvider"
import type { Session } from "@/demo/types"
import { cn } from "@/lib/utils"

const models = [
  {
    id: "deepseek-v4.1-flash",
    label: "deepseek-v4.1-flash",
    provider: "OpenCode Go",
    detail: "Rápido · uso geral",
    icon: Brain,
  },
  {
    id: "deepseek-v4.1-pro",
    label: "deepseek-v4.1-pro",
    provider: "OpenCode Go",
    detail: "Raciocínio mais longo",
    icon: Brain,
  },
  {
    id: "glm-4.6",
    label: "glm-4.6",
    provider: "Z.AI",
    detail: "Alternativa conectada",
    icon: Sparkles,
  },
]

const efforts = [
  { id: "baixo", label: "Baixo", detail: "Respostas curtas" },
  { id: "médio", label: "Médio", detail: "Equilíbrio" },
  { id: "alto", label: "Alto", detail: "Mais raciocínio" },
]

export function ModelSelector({ session }: { session: Session }) {
  const { dispatch } = useDemo()

  function select(model: string, effort: string) {
    dispatch({ type: "SET_SESSION_MODEL", sessionId: session.id, model, effort })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Alterar modelo e effort"
          className="flex h-7 min-w-0 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Brain className="size-3.5 shrink-0" />
          <span className="max-w-32 truncate font-mono text-[10px]">{session.model}</span>
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            · {session.effort}
          </span>
          <ChevronDown className="size-3 shrink-0" />
          <span className="sr-only">Alterar modelo e effort</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-xs font-semibold">Modelo e effort</p>
          <p className="text-[10px] text-muted-foreground">
            Modelos e effort ilustrativos; seleção local do demo, sem chamada ao provedor.
          </p>
        </div>
        <div className="p-2">
          <p className="px-1 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Modelo
          </p>
          <div className="space-y-1">
            {models.map((model) => {
              const Icon = model.icon
              const active = session.model === model.id
              return (
                <button
                  key={model.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => select(model.id, session.effort)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active && "bg-accent",
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[11px] font-medium">
                      {model.label}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {model.provider} · {model.detail}
                    </span>
                  </span>
                  {active && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>

          <p className="mt-3 px-1 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Effort
          </p>
          <div className="grid grid-cols-3 gap-1">
            {efforts.map((effort) => {
              const active = session.effort === effort.id
              return (
                <button
                  key={effort.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => select(session.model, effort.id)}
                  title={effort.detail}
                  className={cn(
                    "rounded-md border px-1 py-1.5 text-[11px] transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active
                      ? "border-primary/40 bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {effort.label}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
