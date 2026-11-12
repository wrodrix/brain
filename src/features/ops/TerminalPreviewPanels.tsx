import * as React from "react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ClipboardPaste, Power, TerminalSquare } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/surface"
import { useDemo } from "@/demo/DemoProvider"
import type { Worktree } from "@/demo/types"
import { cn } from "@/lib/utils"

export function TerminalPanel({ worktree }: { worktree: Worktree }) {
  const { state } = useDemo()
  const terminals = state.terminals.filter((terminal) => terminal.worktreeId === worktree.id)
  const [selectedId, setSelectedId] = React.useState(terminals[0]?.id ?? null)
  const terminal = terminals.find((item) => item.id === selectedId) ?? terminals[0] ?? null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
        <TerminalSquare className="size-4 text-slate-700" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Terminal</h2>
          <p className="text-[10px] text-muted-foreground">
            Saída reproduzida · sem shell conectada · entrada desativada
          </p>
        </div>
        <Badge variant="warning">terminal demonstrativo</Badge>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <Alert variant="warning">
          <div>
            <p className="font-medium">Sem shell conectada.</p>
            <p>
              Nenhum comando digitado é executado. Ctrl+C, colagem, resize e encerramento de PTY
              pertencem ao marco operacional; aqui os controles são ilustrativos.
            </p>
          </div>
        </Alert>

        {terminals.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum terminal nesta fixture.
          </div>
        )}

        {terminals.length > 0 && (
          <div className="flex gap-1 overflow-x-auto">
            {terminals.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] whitespace-nowrap",
                  item.id === terminal?.id
                    ? "border-primary/30 bg-accent font-medium"
                    : "bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                {item.title}
              </button>
            ))}
          </div>
        )}

        {terminal && (
          <div className="overflow-hidden rounded-lg border">
            <div className="flex flex-wrap items-center gap-2 border-b bg-slate-900 px-3 py-1.5 text-[10px] text-slate-300">
              <span className="font-mono">{terminal.id}</span>
              <span>· {worktree.path}</span>
              <Badge
                variant={
                  terminal.status === "connected"
                    ? "success"
                    : terminal.status === "reconnecting"
                      ? "warning"
                      : "muted"
                }
                className="ml-auto"
              >
                {terminal.status === "connected"
                  ? "saída reproduzida"
                  : terminal.status === "reconnecting"
                    ? "reconectando"
                    : "PTY encerrado"}
              </Badge>
            </div>
            <div className="bg-slate-950 p-3">
              <pre className="thin-scrollbar max-h-72 overflow-auto font-mono text-[11px] leading-relaxed text-slate-200">
                {terminal.output.join("\n")}
                {terminal.status !== "ended" && (
                  <span className="mt-1 block text-slate-500">
                    $ <span className="animate-pulse">█</span>
                  </span>
                )}
              </pre>
            </div>
            <div className="flex flex-wrap items-center gap-1 border-t bg-slate-900 px-2 py-1.5">
              {["Ctrl", "C", "Tab", "Esc"].map((key) => (
                <Button
                  key={key}
                  size="xs"
                  variant="secondary"
                  className="h-6 min-w-8 bg-slate-800 px-1.5 font-mono text-[10px] text-slate-200 hover:bg-slate-700"
                  disabled
                  title="Entrada desativada no demo"
                >
                  {key}
                </Button>
              ))}
              {[ArrowUp, ArrowDown, ArrowLeft, ArrowRight].map((Icon, index) => (
                <Button
                  key={index}
                  size="icon-sm"
                  variant="secondary"
                  className="size-6 bg-slate-800 text-slate-200"
                  disabled
                  title="Entrada desativada no demo"
                  aria-label="Tecla de terminal (indisponível)"
                >
                  <Icon className="size-3" />
                </Button>
              ))}
              <Button
                size="xs"
                variant="secondary"
                className="ml-auto h-6 bg-slate-800 text-[10px] text-slate-200"
                disabled
                onClick={() => toast.info("Colagem desativada no demo.")}
              >
                <ClipboardPaste /> Colar
              </Button>
              <Button
                size="xs"
                variant="secondary"
                className="h-6 bg-slate-800 text-[10px] text-slate-200"
                disabled
                title="Encerrar PTY real é uma operação do M3"
              >
                <Power /> Encerrar
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-2.5">
            <p className="font-medium text-foreground">Reconexão (futuro)</p>
            <p>
              Sincronizar saída e controle sem reenviar teclas. Controle de entrada será exclusivo de
              um dispositivo.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-2.5">
            <p className="font-medium text-foreground">PTY encerrado</p>
            <p>
              Um PTY encerrado não é recriado silenciosamente. O usuário abriria outro terminal em
              uma ação explícita.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PreviewPanel({ worktree }: { worktree: Worktree }) {
  const { state } = useDemo()
  const previews = state.previews.filter((preview) => preview.worktreeId === worktree.id)
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Preview</h2>
          <p className="text-[10px] text-muted-foreground">
            URL fictícia · nada é aberto, exposto ou verificado automaticamente
          </p>
        </div>
        <Badge variant="warning">sem túnel ou porta aberta</Badge>
      </div>
      <div className="thin-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        <Alert variant="info">
          <div>
            <p className="font-medium">O demo não abre URLs.</p>
            <p>
              O caminho inicial previsto é uma URL já acessível na rede escolhida, com ação explícita
              “abrir em nova aba”. Topologia, DNS e autenticação ainda serão provados.
            </p>
          </div>
        </Alert>
        {previews.map((preview) => (
          <div key={preview.id} className="rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{preview.title}</span>
              <Badge
                variant={
                  preview.status === "ready"
                    ? "success"
                    : preview.status === "offline"
                      ? "danger"
                      : "muted"
                }
              >
                {preview.status === "ready"
                  ? "processo vivo · HTTP pronto"
                  : preview.status === "offline"
                    ? "offline"
                    : preview.status === "revoked"
                      ? "acesso revogado"
                      : "iframe bloqueado"}
              </Badge>
              <Badge variant={preview.access === "public" ? "warning" : "outline"}>
                acesso:{" "}
                {preview.access === "harness"
                  ? "autenticado pelo harness (ilustrativo)"
                  : preview.access === "private"
                    ? "rede privada"
                    : "público"}
              </Badge>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground uppercase">URL fictícia</p>
            <code className="mt-0.5 block overflow-x-auto rounded border bg-slate-50 px-2 py-1 font-mono text-[11px]">
              {preview.url}
            </code>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{preview.detail}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button size="xs" disabled title="URL externa não é aberta no demo">
                Abrir em nova aba
              </Button>
              <Button size="xs" variant="outline" disabled title="Configuração de acesso fora do M1">
                Configurar acesso…
              </Button>
              {preview.access === "public" && (
                <span className="self-center text-[10px] font-medium text-amber-800">
                  Público · acesso controlado fora do harness
                </span>
              )}
            </div>
          </div>
        ))}
        {previews.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum preview cadastrado neste worktree.
          </div>
        )}
      </div>
    </div>
  )
}
