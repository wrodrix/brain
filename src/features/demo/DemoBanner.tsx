import * as React from "react"
import {
  BookOpen,
  CircleHelp,
  Pause,
  Play,
  RotateCcw,
  StepForward,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDemo } from "@/demo/DemoProvider"
import { scenarios } from "@/demo/fixtures"

export function DemoBanner({
  onOpenAbout,
  onOpenGuide,
}: {
  onOpenAbout: () => void
  onOpenGuide: () => void
}) {
  const { state, advance, play, pause, reset, setScenario } = useDemo()
  const [resetOpen, setResetOpen] = React.useState(false)
  const sim = state.ui.sim
  const activeScenario = scenarios.find((scenario) => scenario.id === state.ui.scenario)

  return (
    <div className="sticky top-0 z-40 border-b border-amber-300/70 bg-amber-50/95 text-amber-950 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1.5 sm:px-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight sm:text-xs">
          <span aria-hidden="true" className="size-2 rounded-full bg-amber-500" />
          Demonstração — dados fictícios, sem execução real
        </span>
        <span className="hidden text-[10px] text-amber-800 xl:inline">
          Projetos em memória; login e sessões persistem.
        </span>

        <div className="ml-auto flex min-w-0 items-center gap-1">
          <label className="sr-only" htmlFor="scenario-select">
            Cenário de demonstração
          </label>
          <select
            id="scenario-select"
            value={state.ui.scenario}
            onChange={(event) => {
              const scenario = scenarios.find((item) => item.id === event.target.value)
              if (!scenario) return
              setScenario(scenario.id)
            }}
            title={activeScenario?.description}
            className="h-7 max-w-[9.5rem] truncate rounded-md border border-amber-300 bg-white/90 px-1.5 text-[11px] font-medium text-amber-950 sm:max-w-52"
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-md border border-amber-300 bg-white/80 p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="size-6 rounded-sm text-amber-950 hover:bg-amber-100"
                  onClick={() => (sim.playing ? pause() : play())}
                  aria-label={sim.playing ? "Pausar simulação" : "Reproduzir simulação"}
                >
                  {sim.playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{sim.playing ? "Pausar reprodução" : "Reproduzir eventos"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="size-6 rounded-sm text-amber-950 hover:bg-amber-100"
                  onClick={advance}
                  aria-label="Avançar um evento"
                >
                  <StepForward className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Avançar um evento</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="size-6 rounded-sm text-amber-950 hover:bg-amber-100"
                  onClick={() => setResetOpen(true)}
                  aria-label="Reiniciar cenário"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reiniciar cenário</TooltipContent>
            </Tooltip>
          </div>

          <span className="hidden w-14 text-center font-mono text-[10px] text-amber-800 sm:inline">
            {sim.tick}/{sim.totalTicks}
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-amber-950 hover:bg-amber-100"
                onClick={onOpenGuide}
                aria-label="Abrir roteiro guiado"
              >
                <BookOpen className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Roteiro guiado</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-amber-950 hover:bg-amber-100"
                onClick={onOpenAbout}
                aria-label="Sobre a demonstração"
              >
                <CircleHelp className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sobre a demonstração</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reiniciar a demonstração?</DialogTitle>
            <DialogDescription>
              O cenário volta ao estado inicial determinístico. Rascunhos, fila, edições de arquivo,
              comentários e merges simulados serão descartados. Usuário, sessão e confiança de
              dispositivo não são afetados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                reset()
                setResetOpen(false)
                toast.info("Cenário reiniciado. Nenhum dado externo foi afetado.")
              }}
            >
              <RotateCcw /> Reiniciar cenário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
