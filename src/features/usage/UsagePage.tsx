import { Link } from "react-router-dom"
import { ArrowLeft, Database, Gauge } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/surface"
import { ConsumptionPanel } from "@/features/ops/ConsumptionPanel"

export function UsagePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/"
        className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Projetos
      </Link>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <Gauge className="size-5 text-primary" /> Cotas e conexões
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Contexto, uso reportado e quota externa são dimensões diferentes. Dados ausentes
            permanecem explicitamente indisponíveis.
          </p>
        </div>
        <Link
          to="/settings"
          className="ml-auto text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Configurações de acesso
        </Link>
      </div>
      <Alert variant="warning" className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Database className="size-3.5" />
          <span>
            Nenhuma chave real é solicitada. O painel não consulta provedores, não calcula saldo e
            não abre consoles externos.
          </span>
          <Badge variant="outline" className="ml-auto">
            fonte: fixtures
          </Badge>
        </div>
      </Alert>
      <div className="mt-3">
        <ConsumptionPanel />
      </div>
    </div>
  )
}
