import * as React from "react"
import {
  CircleDollarSign,
  Database,
  Gauge,
  KeyRound,
  ShieldAlert,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui/surface"
import { useDemo } from "@/demo/DemoProvider"
import { ProviderMark } from "@/features/usage/PlanPopover"
import { formatDateTime } from "@/lib/utils"

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function ConsumptionPanel({ compact = false }: { compact?: boolean }) {
  const { state } = useDemo()
  const connections = state.connections
  const [activeId, setActiveId] = React.useState(connections[0]?.id ?? "")
  const connection = connections.find((item) => item.id === activeId) ?? connections[0]
  if (!connection) return null
  const contextPercent =
    connection.context.used !== null && connection.context.limit
      ? (connection.context.used / connection.context.limit) * 100
      : null
  const primaryQuota =
    connection.quotaWindows.find((window) => window.used !== null) ?? null

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {connections.length > 1 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Conexões disponíveis">
          {connections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              aria-pressed={item.id === connection.id}
              className={
                item.id === connection.id
                  ? "flex items-center gap-1.5 rounded-full border border-primary/40 bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground"
                  : "flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-secondary"
              }
            >
              <ProviderMark provider={item.provider} />
              {item.name}
            </button>
          ))}
        </div>
      )}
      {primaryQuota && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <Wallet className="size-4 text-primary" /> Uso do plano
              </span>
              <span className="font-mono text-lg font-semibold">{primaryQuota.used}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 p-3 pt-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-medium">{primaryQuota.label}</p>
              <span className="text-[11px] text-muted-foreground">
                {primaryQuota.remaining}% restante
              </span>
            </div>
            <Progress
              value={primaryQuota.used}
              className="h-2"
              label={`Uso da ${primaryQuota.label}`}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span>
                reset: {primaryQuota.resetAt ? formatDateTime(primaryQuota.resetAt) : "não disponível"}
              </span>
              <span>
                leitura: {primaryQuota.readAt ? formatDateTime(primaryQuota.readAt) : "não disponível"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{primaryQuota.source}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <KeyRound className="size-4 text-primary" /> Minha conexão · {connection.name}
            <Badge variant="outline">{connection.provider}</Badge>
            <Badge variant="muted">{connection.plan}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 p-3 pt-1 sm:grid-cols-2">
          <div className="text-xs">
            <p className="text-[10px] text-muted-foreground uppercase">Titular</p>
            <p>{connection.holder} · identidade fictícia</p>
          </div>
          <div className="text-xs">
            <p className="text-[10px] text-muted-foreground uppercase">Chave API</p>
            <p className="text-amber-800">{connection.keyState}</p>
          </div>
          <div className="text-xs sm:col-span-2">
            <p className="text-[10px] text-muted-foreground uppercase">Catálogo</p>
            <p>{connection.catalogState}</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="demo-api-key" className="text-[10px] font-medium text-muted-foreground uppercase">
              Cadastrar chave (desativado)
            </label>
            <input
              id="demo-api-key"
              type="password"
              disabled
              placeholder="Não solicitamos nem armazenamos credenciais reais"
              className="mt-1 h-8 w-full rounded-md border border-input bg-slate-100 px-2 text-xs disabled:cursor-not-allowed"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Button size="xs" disabled title="Salvar conexão real pertence ao M2">
                Salvar conexão
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled
                title="Validação autenticada e cobrança não fazem parte do M1"
              >
                Validar acesso
              </Button>
              <span className="self-center text-[10px] text-muted-foreground">
                Salvar e testar inferência são operações distintas em um marco futuro.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="size-4 text-primary" /> Contexto ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 p-3 pt-1">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-lg font-semibold">
                {connection.context.used === null
                  ? "não disponível"
                  : new Intl.NumberFormat("pt-BR").format(connection.context.used)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                / {connection.context.limit === null ? "limite não descoberto" : new Intl.NumberFormat("pt-BR").format(connection.context.limit)}
              </span>
            </div>
            <Progress value={contextPercent} label="Contexto usado" />
            <p className="text-[10px] text-muted-foreground">
              Estimativa do cenário. Contexto não é a mesma coisa que consumo da sessão nem quota do
              plano. Limite efetivo do modelo não é inferido pelo demo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Gauge className="size-4 text-primary" /> Uso da sessão
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-1.5 p-3 pt-1">
            <Metric
              label="Entrada"
              value={
                connection.sessionUsage.input === null
                  ? "—"
                  : new Intl.NumberFormat("pt-BR").format(connection.sessionUsage.input)
              }
            />
            <Metric
              label="Saída"
              value={
                connection.sessionUsage.output === null
                  ? "—"
                  : new Intl.NumberFormat("pt-BR").format(connection.sessionUsage.output)
              }
            />
            <Metric
              label="Cache"
              value={
                connection.sessionUsage.cache === null
                  ? "—"
                  : new Intl.NumberFormat("pt-BR").format(connection.sessionUsage.cache)
              }
            />
            <p className="col-span-3 text-[10px] text-muted-foreground">
              Valores fictícios de chamadas reportadas. Não são custo cobrado nem saldo.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wallet className="size-4 text-primary" /> Quota do plano
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-1">
          <div className="grid gap-1.5 sm:grid-cols-3">
            {connection.quotaWindows.map((window) => (
              <div key={window.id} className="rounded-lg border p-2.5">
                <p className="text-[11px] font-medium">{window.label}</p>
                {window.used !== null ? (
                  <>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="font-mono text-xl font-semibold">{window.used}%</span>
                      <span className="text-[10px] text-muted-foreground">
                        {window.remaining}% restante
                      </span>
                    </div>
                    <Progress
                      value={window.used}
                      className="mt-1.5 h-1.5"
                      label={`Uso da ${window.label}`}
                    />
                  </>
                ) : (
                  <p className="mt-1 font-mono text-xl font-semibold text-muted-foreground">—</p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">{window.source}</p>
                <p className="text-[10px] text-muted-foreground">
                  leitura: {window.readAt ? formatDateTime(window.readAt) : "não disponível"}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="xs"
              variant="outline"
              onClick={() =>
                toast.info("Fonte externa não consultada neste demo.", {
                  description:
                    "Atualizar quotas reais exige autenticação e adapter próprios, fora do M1.",
                })
              }
            >
              Tentar atualizar
            </Button>
            <Button size="xs" variant="ghost" disabled title="Console externo não é aberto no demo">
              Abrir Console
            </Button>
            <span className="text-[10px] text-muted-foreground">
              Dado ausente não vira zero. Nenhum saldo é calculado localmente.
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CircleDollarSign className="size-4 text-amber-700" /> Cobrança adicional / Extra Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 p-3 pt-1 text-xs">
            <Badge variant="warning">não verificado</Badge>
            <p>{connection.extraUsageNote}</p>
            <Button size="xs" variant="outline" disabled title="Sem integração de cobrança neste demo">
              Abrir console de cobrança
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="size-4 text-amber-700" /> Preferências e limites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-3 pt-1 text-xs">
            <p>Não trocar automaticamente de conexão ou modalidade.</p>
            <p>Não prometer saldo global calculado a partir do uso local.</p>
            <p>Mudar de modelo pode exigir recorte/compactação explícitos.</p>
            <Alert variant="info">
              Painel preparado para várias conexões próprias no futuro; o primeiro adapter real é
              Go em um marco posterior.
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
