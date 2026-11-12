import * as React from "react"
import { ArrowUp, Plus, Square } from "lucide-react"
import { toast } from "sonner"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group"
import { useDemo } from "@/demo/DemoProvider"
import type { Session, SourceRef } from "@/demo/types"
import { ComposerEditor, type MentionData } from "./ComposerEditor"
import { ContextPopover } from "./ContextPopover"
import { ModelSelector } from "./ModelSelector"
import { ConversationOrb, ConversationStartButton, MicControl } from "./VoiceControls"
import { SourceList } from "./SourceAttachment"

export function PromptComposer({
  session,
  blockedReason,
  mentionData,
  onSend,
  onStop,
}: {
  session: Session
  blockedReason: string | null
  mentionData: MentionData
  onSend: (preference: "next-safe" | "after-current") => void
  onStop: () => void
}) {
  const { state, dispatch } = useDemo()
  const draft = state.ui.drafts[session.id] ?? ""
  const sources = state.ui.composerSources[session.id] ?? []
  const [preference, setPreference] =
    React.useState<"next-safe" | "after-current">("next-safe")
  const [conversationActive, setConversationActive] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const actionBarRef = React.useRef<HTMLDivElement | null>(null)
  const conversationInteracted = React.useRef(false)
  const running = session.status === "running"
  const primaryConnection = state.connections[0]

  React.useEffect(() => {
    if (!conversationInteracted.current) return
    const selector = conversationActive
      ? 'button[aria-label="Encerrar modo conversacional"]'
      : 'button[aria-label="Abrir modo conversacional"]'
    actionBarRef.current?.querySelector<HTMLButtonElement>(selector)?.focus()
  }, [conversationActive])

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${Math.round(kb)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  function insertTranscript(text: string) {
    const next = draft.trim() ? `${draft.trim()} ${text}` : text
    dispatch({ type: "SET_DRAFT", sessionId: session.id, value: next })
  }

  function attachFiles(files: File[]) {
    const maxSize = 8 * 1024 * 1024
    const accepted = files.filter((file) => file.size <= maxSize)
    if (accepted.length < files.length) {
      toast.error("Anexo acima de 8 MB ignorado neste demo.")
    }
    accepted.forEach((file, index) => {
      const source: SourceRef = {
        id: `upload-${session.id}-${Date.now()}-${index}-${file.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
        kind: "file",
        label: file.name,
        detail: `${file.type || "arquivo"} · ${formatBytes(file.size)} · upload simulado`,
        path: file.name,
        mimeType: file.type || undefined,
        size: file.size,
        provenance: "Anexo local do demo; nenhum upload externo foi realizado.",
      }
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = () => {
          dispatch({
            type: "ADD_SOURCE",
            sessionId: session.id,
            source: { ...source, thumbnail: String(reader.result) },
          })
        }
        reader.readAsDataURL(file)
      } else {
        dispatch({ type: "ADD_SOURCE", sessionId: session.id, source })
      }
    })
    if (accepted.length > 0) {
      toast.success(`${accepted.length} anexo${accepted.length === 1 ? "" : "s"} adicionado${accepted.length === 1 ? "" : "s"} ao contexto.`, {
        description: "Upload simulado; nenhum arquivo sai deste navegador.",
      })
    }
  }

  return (
    <form
      className="mx-auto w-full max-w-3xl px-3 pb-2 sm:px-5 sm:pb-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!draft.trim() || blockedReason) return
        onSend(preference)
      }}
    >
      {conversationActive && <ConversationOrb />}

      <InputGroup className="bg-card shadow-sm">
        {sources.length > 0 && (
          <InputGroupAddon align="block-start" className="flex-wrap pb-1">
            <div className="flex w-full items-center gap-1.5">
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                Contexto
              </span>
              <SourceList
                sources={sources}
                compact
                onRemove={(source) =>
                  dispatch({ type: "REMOVE_SOURCE", sessionId: session.id, sourceId: source.id })
                }
              />
            </div>
          </InputGroupAddon>
        )}

        <ComposerEditor
          key={session.id}
          value={draft}
          onChange={(value) => dispatch({ type: "SET_DRAFT", sessionId: session.id, value })}
          onSubmit={() => {
            if (!draft.trim() || blockedReason) return
            onSend(preference)
          }}
          onAddSource={(source) =>
            dispatch({ type: "ADD_SOURCE", sessionId: session.id, source })
          }
          onAttachFiles={attachFiles}
          mentionData={mentionData}
          disabled={Boolean(blockedReason)}
          placeholder={
            blockedReason
              ? blockedReason
              : "Peça uma alteração, cole um erro ou use @ e # para anexar contexto…"
          }
          ariaLabel={`Mensagem para a sessão ${session.title}`}
        />

        <InputGroupAddon align="block-end" className="gap-1 pt-0.5">
          <InputGroupButton
            size="icon-sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={Boolean(blockedReason)}
            aria-label="Anexar arquivo ou imagem"
            title="Anexar arquivo ou imagem (upload simulado)"
          >
            <Plus />
          </InputGroupButton>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.txt,.md,.json,.php,.ts,.tsx,.js,.css,.html,.pdf"
            className="hidden"
            onChange={(event) => {
              attachFiles(Array.from(event.target.files ?? []))
              event.target.value = ""
            }}
          />

          <div ref={actionBarRef} className="ml-auto flex min-w-0 items-center gap-1">
            {running && !blockedReason && draft.trim().length > 0 && (
              <label className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
                <span className="sr-only">Entrega desta mensagem</span>
                <select
                  aria-label="Entrega desta mensagem"
                  className="h-7 max-w-40 rounded-lg border-0 bg-transparent px-1 text-[11px] text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  value={preference}
                  onChange={(event) =>
                    setPreference(event.target.value as "next-safe" | "after-current")
                  }
                >
                  <option value="next-safe">Próximo ponto seguro</option>
                  <option value="after-current">Depois do trabalho atual</option>
                </select>
              </label>
            )}
            {primaryConnection && <ContextPopover connection={primaryConnection} />}
            <MicControl disabled={Boolean(blockedReason)} onInsert={insertTranscript} />
            {conversationActive ? (
              <InputGroupButton
                type="button"
                size="icon-sm"
                variant="default"
                className="ms-1"
                onClick={() => {
                  conversationInteracted.current = true
                  setConversationActive(false)
                }}
                aria-label="Encerrar modo conversacional"
                title="Encerrar modo conversacional"
              >
                <Square className="size-3.5 fill-current" />
              </InputGroupButton>
            ) : draft.trim() ? (
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                className="ms-1"
                disabled={Boolean(blockedReason)}
                aria-label="Enviar"
                title={blockedReason ?? "Enviar mensagem (simulado)"}
              >
                <ArrowUp />
              </InputGroupButton>
            ) : running ? (
              <InputGroupButton
                type="button"
                size="icon-sm"
                variant="default"
                className="ms-1"
                onClick={onStop}
                aria-label="Parar execução"
                title="Interromper execução (Esc)"
              >
                <Square className="size-3.5 fill-current" />
              </InputGroupButton>
            ) : (
              <ConversationStartButton
                disabled={Boolean(blockedReason)}
                onClick={() => {
                  conversationInteracted.current = true
                  setConversationActive(true)
                }}
              />
            )}
          </div>
        </InputGroupAddon>
      </InputGroup>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="font-mono text-[10px]">@</span> arquivos
          <span aria-hidden="true">·</span>
          <span className="font-mono text-[10px]">#</span> issues
        </span>
        <span className="hidden sm:inline">⌘/Ctrl+Enter envia</span>
        <div className="ml-auto flex items-center gap-2">
          <ModelSelector session={session} />
          <button
            type="button"
            className="hidden underline-offset-2 hover:underline sm:inline"
            onClick={() =>
              toast.info("O envio é local. Nenhum modelo, shell ou serviço externo é chamado.")
            }
          >
            Sobre este envio
          </button>
        </div>
      </div>
    </form>
  )
}
