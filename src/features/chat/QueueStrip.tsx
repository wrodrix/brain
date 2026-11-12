import { CheckCircle2, CircleDashed, Clock3, ListTodo, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import type { QueueItem } from "@/demo/types"
import { cn } from "@/lib/utils"

const stateLabel: Record<QueueItem["state"], string> = {
  admitted: "aguardando entrega",
  delivered: "entregue",
  incorporated: "incorporada",
  deferred: "ação adiada",
}

export function QueueStrip({
  items,
  onPreference,
  onCancel,
}: {
  items: QueueItem[]
  onPreference: (queueId: string, preference: QueueItem["preference"]) => void
  onCancel: (queueId: string) => void
}) {
  if (items.length === 0) return null
  const pending = items.filter(
    (item) => item.state === "admitted" || item.state === "delivered",
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pt-1 sm:px-5">
      <Trace>
        <TraceCollapsible defaultOpen={pending.length > 0}>
          <TraceCollapsibleTrigger
            aria-label={`Fila deste worktree · ${
              pending.length > 0
                ? `${pending.length} mensagem${pending.length === 1 ? "" : "s"} na fila`
                : `${items.length} entrega${items.length === 1 ? "" : "s"} recente${items.length === 1 ? "" : "s"}`
            }`}
          >
            <TraceLine>
              <TraceIcon>
                <ListTodo />
              </TraceIcon>
              <TraceTitle>
                {pending.length > 0
                  ? `${pending.length} mensagem${pending.length === 1 ? "" : "s"} na fila`
                  : `${items.length} entrega${items.length === 1 ? "" : "s"} recente${items.length === 1 ? "" : "s"}`}
              </TraceTitle>
            </TraceLine>
          </TraceCollapsibleTrigger>
          <TraceCollapsibleContent className="flex flex-col gap-1.5">
            {items.map((item) => {
              const isPending = item.state === "admitted" || item.state === "delivered"
              return (
                <div
                  key={item.id}
                  className="min-w-0 rounded-lg border bg-card px-2.5 py-2 text-xs"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    {item.state === "admitted" || item.state === "delivered" ? (
                      <Clock3 className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
                    ) : item.state === "incorporated" ? (
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-700" />
                    ) : (
                      <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 leading-relaxed">{item.content}</span>
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 pl-5">
                    <span
                      className={cn(
                        "text-[11px] text-muted-foreground",
                        item.state === "deferred" && "text-muted-foreground",
                      )}
                    >
                      {stateLabel[item.state]}
                    </span>
                    {item.state === "admitted" && (
                      <select
                        aria-label="Preferência de entrega"
                        className="ml-auto h-6 max-w-44 rounded-md border bg-card px-1 text-[10px]"
                        value={item.preference}
                        onChange={(event) =>
                          onPreference(
                            item.id,
                            event.target.value as QueueItem["preference"],
                          )
                        }
                      >
                        <option value="next-safe">Próximo ponto seguro</option>
                        <option value="after-current">Depois do atual</option>
                      </select>
                    )}
                    {isPending && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="size-6 text-muted-foreground"
                        onClick={() => onCancel(item.id)}
                        aria-label="Cancelar mensagem pendente"
                        title="Cancelar mensagem pendente"
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </TraceCollapsibleContent>
        </TraceCollapsible>
      </Trace>
    </div>
  )
}
