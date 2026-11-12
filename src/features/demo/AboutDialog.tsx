import * as React from "react"
import {
  Ban,
  Bot,
  Database,
  FileWarning,
  HardDrive,
  Info,
  KeyRound,
  MonitorSmartphone,
  ShieldAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert } from "@/components/ui/surface"
import { useDemo } from "@/demo/DemoProvider"

const limits = [
  {
    icon: Bot,
    title: "Nenhum modelo é chamado",
    text: "Todo o streaming, raciocínio e texto de agente é reprodução determinística de fixtures.",
  },
  {
    icon: Database,
    title: "Sem backend ou persistência durável",
    text: "O estado vive em memória. Recarregar ou fechar a aba reinicia o cenário e descarta rascunhos.",
  },
  {
    icon: HardDrive,
    title: "Sem filesystem, Git ou worktree reais",
    text: "Arquivos são editados em memória. Merge, remoção e setup não tocam o host nem o remoto.",
  },
  {
    icon: KeyRound,
    title: "Sem credenciais, auth ou integrações",
    text: "Nenhuma chave, senha, conta GitHub/Google, MCP ou dispositivo real é solicitado ou armazenado.",
  },
  {
    icon: MonitorSmartphone,
    title: "Terminal e preview são ilustrativos",
    text: "Não há shell conectada, execução de comandos, portas abertas, túnel ou preview de app real.",
  },
  {
    icon: FileWarning,
    title: "Estado incerto é intencional",
    text: "Métricas ausentes aparecem como indisponíveis; nunca viram zero ou valores inventados.",
  },
]

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto thin-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            Sobre esta demonstração
          </DialogTitle>
          <DialogDescription>
            Brain é um codinome interno. Esta é a interface M1 do harness, navegável e sem execução
            externa.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="warning">
          <div>
            <p className="font-semibold">Demonstração — dados fictícios, sem execução real.</p>
            <p className="mt-0.5">
              O objetivo é validar navegação, estados, acessibilidade e interações locais do recorte
              M1. Isto não é o MVP utilizável em produção.
            </p>
          </div>
        </Alert>

        <ul className="grid gap-2 sm:grid-cols-2">
          {limits.map((limit) => (
            <li key={limit.title} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <limit.icon className="size-3.5 text-primary" />
                {limit.title}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{limit.text}</p>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <ShieldAlert className="size-3.5 text-amber-700" />
            Limites de segurança preservados
          </div>
          <ul className="mt-1.5 grid list-disc gap-1 pl-4 text-[11px] text-muted-foreground sm:grid-cols-2">
            <li>Sem HTML/JS arbitrário renderizado</li>
            <li>Sem imagens ou links externos carregados</li>
            <li>Sem áudio ou microfone</li>
            <li>Sem comandos digitados executados</li>
            <li>Sem escrita em repositório real</li>
            <li>Sem deploy, push ou publicação</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline">M1.0–M1.5</Badge>
          <span>Stack: React · Vite · TypeScript · Tailwind · shadcn/ui · CodeMirror 6</span>
          <span className="inline-flex items-center gap-1">
            <Ban className="size-3" /> integrações externas desativadas
          </span>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const guidedSteps = [
  {
    title: "Retomar um projeto e worktree",
    text: "Veja ambiente, branch, setup e a última sessão sem procurar IDs técnicos.",
    to: "/",
  },
  {
    title: "Abrir o chat e enviar Markdown",
    text: "Digite listas, citação e bloco de código. A formatação acontece no próprio editor.",
    to: "/projects/atlas/worktrees/wt-login?view=chat",
  },
  {
    title: "Enviar durante a execução",
    text: "Escolha o cenário “Mensagem durante execução” e observe admissão, entrega e adição à fila.",
    to: "/projects/atlas/worktrees/wt-login?view=chat",
  },
  {
    title: "Abrir uma issue sem perder o rascunho",
    text: "Use Issues no cabeçalho. Edite um comentário, feche e reabra: o texto continua.",
    to: "/projects/atlas/worktrees/wt-login?view=chat",
  },
  {
    title: "Editar arquivo e simular conflito",
    text: "Em Arquivos, edite o buffer, clique em “Simular mudança externa” e tente salvar.",
    to: "/projects/atlas/worktrees/wt-login?view=files",
  },
  {
    title: "Buscar histórico e adicionar trecho",
    text: "Busque “redirect”, abra o trecho e depois use “Adicionar ao prompt” como ação separada.",
    to: "/projects/atlas/worktrees/wt-login?view=chat",
  },
  {
    title: "Revisar gates e simular merge",
    text: "Avance a simulação até os gates concluírem. O merge não remove o worktree.",
    to: "/projects/atlas/worktrees/wt-login?view=review",
  },
  {
    title: "Conferir painéis operacionais",
    text: "Terminal reproduzido, preview sem abertura externa, processos com métricas ausentes.",
    to: "/projects/atlas/worktrees/wt-login?view=ops",
  },
]

export function GuidedDemoDialog({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (to: string) => void
}) {
  const { state, setScenario } = useDemo()
  const [completed, setCompleted] = React.useState<number[]>([])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto thin-scrollbar">
        <DialogHeader>
          <DialogTitle>Roteiro guiado do M1</DialogTitle>
          <DialogDescription>
            Oito paradas para revisar as jornadas principais. Nada aqui executa operações reais.
          </DialogDescription>
        </DialogHeader>
        <Alert variant="info">
          O estado é reiniciado ao recarregar. Use os controles do banner para pausar, avançar ou
          resetar o cenário atual.
        </Alert>
        <ol className="space-y-2">
          {guidedSteps.map((step, index) => (
            <li key={step.title} className="rounded-lg border bg-card p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{step.text}</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        onNavigate(step.to)
                        onOpenChange(false)
                        setCompleted((previous) =>
                          previous.includes(index) ? previous : [...previous, index],
                        )
                      }}
                    >
                      Abrir esta etapa
                    </Button>
                    {index === 2 && (
                      <Button size="xs" variant="ghost" onClick={() => setScenario("during-run")}>
                        Usar cenário de execução
                      </Button>
                    )}
                    {completed.includes(index) && <Badge variant="success">visitada</Badge>}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="text-[11px] text-muted-foreground">
          Cenário atual: <strong>{state.ui.scenario}</strong> · estado em memória.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar roteiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
