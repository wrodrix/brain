import * as React from "react"
import { FileCode2, FileImage, FileSearch, MessageSquare, UserRound, X } from "lucide-react"

import { MarkdownView } from "@/components/markdown/MarkdownView"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
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
import type { SourceRef } from "@/demo/types"

const sourceIcons = {
  file: FileCode2,
  issue: MessageSquare,
  snippet: FileSearch,
  person: UserRound,
}

export function SourceAttachment({
  source,
  onRemove,
  compact = false,
}: {
  source: SourceRef
  onRemove?: () => void
  compact?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const Icon = source.thumbnail ? FileImage : sourceIcons[source.kind]
  return (
    <>
      <Attachment
        size={compact ? "xs" : "sm"}
        state={source.error ? "error" : "done"}
        className={compact ? "rounded-lg" : undefined}
      >
        <AttachmentMedia
          className={source.thumbnail ? (compact ? "size-8" : "size-10") : undefined}
        >
          {source.thumbnail ? (
            <img
              src={source.thumbnail}
              alt={`Prévia de ${source.label}`}
              className="size-full object-cover"
            />
          ) : (
            <Icon />
          )}
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>
            <button
              type="button"
              className="max-w-52 truncate text-left hover:underline focus-visible:outline-none"
              onClick={() => setOpen(true)}
              title={`${source.detail} — inspecionar conteúdo`}
            >
              {source.label}
            </button>
          </AttachmentTitle>
          {source.error && !compact && (
            <AttachmentDescription>{source.error}</AttachmentDescription>
          )}
        </AttachmentContent>
        {onRemove && (
          <AttachmentActions>
            <AttachmentAction
              onClick={onRemove}
              aria-label={`Remover fonte ${source.label}`}
            >
              <X />
            </AttachmentAction>
          </AttachmentActions>
        )}
      </Attachment>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="size-4" /> {source.label}
            </DialogTitle>
            <DialogDescription>{source.detail}</DialogDescription>
          </DialogHeader>
          {source.error && <Alert variant="danger">{source.error}</Alert>}
          {source.thumbnail && (
            <img
              src={source.thumbnail}
              alt={`Prévia de ${source.label}`}
              className="max-h-64 w-full rounded-md border bg-slate-50 object-contain"
            />
          )}
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-[11px]">
            <p className="font-medium">Proveniência</p>
            <p className="mt-0.5 text-muted-foreground">
              {source.provenance ?? "Fonte fictícia deste cenário."}
            </p>
            {source.size !== undefined && (
              <p className="mt-0.5 text-muted-foreground">
                {source.mimeType || "arquivo"} · {source.size} bytes
              </p>
            )}
          </div>
          {source.content &&
            (source.kind === "file" ? (
              <pre className="thin-scrollbar max-h-64 overflow-auto rounded-md border bg-slate-50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                {source.content}
              </pre>
            ) : (
              <div className="max-h-64 overflow-auto rounded-md border bg-card p-3">
                <MarkdownView content={source.content} className="text-xs" />
              </div>
            ))}
          {source.kind === "person" && (
            <Alert variant="info">
              Citar uma pessoa não envia notificação, não atribui tarefa e não transfere execução.
            </Alert>
          )}
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function SourceList({
  sources,
  align = "start",
  compact,
  onRemove,
}: {
  sources: SourceRef[]
  align?: "start" | "end"
  compact?: boolean
  onRemove?: (source: SourceRef) => void
}) {
  if (sources.length === 0) return null
  return (
    <div
      className={`flex min-w-0 flex-wrap gap-1.5 ${align === "end" ? "justify-end" : "justify-start"}`}
      aria-label="Fontes anexadas"
    >
      {sources.map((source) => (
        <SourceAttachment
          key={source.id}
          source={source}
          compact={compact}
          onRemove={onRemove ? () => onRemove(source) : undefined}
        />
      ))}
    </div>
  )
}

export function SourceErrorBadge({ source }: { source: SourceRef }) {
  if (!source.error) return null
  return <Badge variant="danger">fonte indisponível</Badge>
}
