import * as React from "react"
import { AudioLines, Check, ChevronDown, Mic, X } from "lucide-react"
import { toast } from "sonner"

import { InputGroupButton } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/surface"

const devices = [
  { id: "default", label: "Microfone interno", detail: "Padrão do sistema", level: 64 },
  { id: "headset", label: "Headset USB", detail: "Entrada 2", level: 38 },
  { id: "interface", label: "Interface de áudio", detail: "Entrada 3", level: 76 },
]

const sampleTranscript = "Ajuste o retorno após o login preservando a URL original."

function Waveform({
  bars = 32,
  className,
  compact = false,
}: {
  bars?: number
  className?: string
  compact?: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center gap-1 ${className ?? "h-16"}`}
    >
      {Array.from({ length: bars }, (_, index) => (
        <span
          key={index}
          className="voice-wave-bar w-1 rounded-full bg-primary/70"
          style={{
            height: compact ? `${6 + ((index * 5) % 18)}px` : `${10 + ((index * 7) % 30)}px`,
            animationDelay: `${(index % 8) * 70}ms`,
          }}
        />
      ))}
    </div>
  )
}

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
}

export function ConversationStartButton({
  disabled,
  onClick,
}: {
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <InputGroupButton
      size="icon-sm"
      variant="default"
      className="ms-1"
      disabled={disabled}
      onClick={onClick}
      aria-label="Abrir modo conversacional"
      title="Modo conversacional (simulado)"
    >
      <AudioLines />
    </InputGroupButton>
  )
}

export function ConversationOrb() {
  const [phase, setPhase] = React.useState<"listening" | "responding">("listening")

  React.useEffect(() => {
    const timer = window.setInterval(
      () => setPhase((value) => (value === "listening" ? "responding" : "listening")),
      3200,
    )
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="mb-2 flex flex-col items-center gap-1.5">
      <div aria-hidden="true" className="voice-orb">
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            className="voice-orb-dot"
            style={{
              transform: `rotate(${index * 36}deg) translateY(-46px)`,
              animationDelay: `${index * 120}ms`,
            }}
          />
        ))}
      </div>
      <p className="text-[11px] font-medium text-muted-foreground">
        Modo conversacional ·{" "}
        <span className="text-primary">
          {phase === "listening" ? "Ouvindo…" : "Respondendo…"}
        </span>
      </p>
      <p className="text-[9px] text-muted-foreground">Simulação local, sem áudio real.</p>
    </div>
  )
}

export function MicControl({
  disabled,
  onInsert,
}: {
  disabled?: boolean
  onInsert: (text: string) => void
}) {
  const [recording, setRecording] = React.useState(false)
  const [deviceId, setDeviceId] = React.useState(devices[0].id)
  const [liveText, setLiveText] = React.useState("")
  const [seconds, setSeconds] = React.useState(0)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const wasRecording = React.useRef(false)
  const device = devices.find((item) => item.id === deviceId) ?? devices[0]

  React.useEffect(() => {
    if (recording && !wasRecording.current) {
      rootRef.current
        ?.querySelector<HTMLButtonElement>('button[aria-label="Cancelar transcrição"]')
        ?.focus()
    } else if (!recording && wasRecording.current) {
      rootRef.current
        ?.querySelector<HTMLButtonElement>('button[aria-label="Iniciar transcrição"]')
        ?.focus()
    }
    wasRecording.current = recording
  }, [recording])

  React.useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [recording])

  React.useEffect(() => {
    if (!recording) return
    const timer = window.setTimeout(() => setLiveText(sampleTranscript), 1200)
    return () => window.clearTimeout(timer)
  }, [recording])

  function start() {
    setSeconds(0)
    setLiveText("")
    setRecording(true)
  }

  function cancel() {
    setRecording(false)
    setLiveText("")
  }

  function finish() {
    onInsert(liveText || sampleTranscript)
    setRecording(false)
    setLiveText("")
    toast.info("Transcrição simulada adicionada ao rascunho.", {
      description: "Nenhum áudio foi capturado ou enviado.",
    })
  }

  if (recording) {
    return (
      <div ref={rootRef} className="contents">
        <div
          className="flex h-7 min-w-0 flex-1 items-center gap-1 rounded-full border bg-card px-1"
        title="Transcrição simulada; nenhum áudio real é capturado"
      >
        <InputGroupButton
          size="icon-sm"
          variant="ghost"
          className="size-7 shrink-0"
          onClick={cancel}
          aria-label="Cancelar transcrição"
          title="Cancelar transcrição"
        >
          <X className="size-3.5" />
        </InputGroupButton>
        <Waveform
          bars={18}
          compact
          className="h-7 min-w-0 flex-1 overflow-hidden"
        />
        <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
          {clock(seconds)}
        </span>
        <InputGroupButton
          size="icon-sm"
          variant="default"
          className="size-7 shrink-0"
          onClick={finish}
          aria-label="Finalizar transcrição"
          title="Finalizar transcrição"
        >
          <Check className="size-3.5" />
        </InputGroupButton>
          <span className="sr-only" aria-live="polite">
            {liveText || "Transcrevendo sua fala…"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="contents">
      <div className="inline-flex h-7 items-center">
        <InputGroupButton
          size="icon-sm"
          variant="ghost"
          className="h-7 rounded-none px-1.5"
          disabled={disabled}
          onClick={start}
          aria-label="Iniciar transcrição"
          title="Transcrição simulada"
        >
          <Mic />
        </InputGroupButton>
        <span aria-hidden="true" className="h-4 w-px bg-border" />
        <Popover>
          <PopoverTrigger asChild>
            <InputGroupButton
              size="icon-sm"
              variant="ghost"
              className="h-7 w-6 rounded-none px-0"
              aria-label="Configurar microfone"
              title="Entrada de áudio"
            >
              <ChevronDown className="size-3" />
            </InputGroupButton>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0">
            <div className="border-b px-3 py-2">
              <p className="text-xs font-semibold">Entrada de áudio</p>
              <p className="text-[10px] text-muted-foreground">
                Dispositivos fictícios · nenhuma captura real.
              </p>
            </div>
            <div className="space-y-1 p-2">
              {devices.map((item) => {
                const active = item.id === device.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDeviceId(item.id)}
                    className={
                      active
                        ? "flex w-full items-center gap-2 rounded-md bg-accent px-2 py-1.5 text-left text-[11px] font-medium"
                        : "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-secondary"
                    }
                  >
                    <Mic className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      <span className="block truncate text-[10px] font-normal text-muted-foreground">
                        {item.detail}
                      </span>
                    </span>
                    {active && <Check className="size-3.5 shrink-0 text-primary" />}
                  </button>
                )
              })}
            </div>
            <div className="border-t px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-medium">Nível detectado</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {recording ? Math.min(96, device.level + 18) : device.level}%
                </span>
              </div>
              <Progress
                value={recording ? Math.min(96, device.level + 18) : device.level}
                className="mt-1"
                label={`Nível de áudio simulado de ${device.label}`}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
