import * as React from "react"
import {
  ArrowLeft,
  GitCompare,
  HardDrive,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/form"
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
import {
  buildFileTree,
  fileSizeLabel,
  getActiveSession,
  getFilesForWorktree,
  isLargeFile,
} from "@/demo/selectors"
import { sourceForFile } from "@/demo/fixtures"
import type { DemoFile, Worktree } from "@/demo/types"
import { cn } from "@/lib/utils"
import { CodeEditor } from "./CodeEditor"
import { DiffView } from "./DiffView"
import { FileTree } from "./FileTree"
import { filterFileTree } from "./file-tree-filter"

export function FilesPanel({
  worktree,
  focusFileId,
  panel = false,
  onClose,
}: {
  worktree: Worktree
  focusFileId?: string | null
  panel?: boolean
  onClose?: () => void
}) {
  const { state, dispatch } = useDemo()
  const files = getFilesForWorktree(state, worktree.id)
  const selectedId = state.ui.selectedFileByWorktree[worktree.id] ?? files[0]?.id ?? null
  const file = files.find((item) => item.id === selectedId) ?? files[0] ?? null
  const [mode, setMode] = React.useState<"view" | "diff" | "edit">("view")
  const [fileQuery, setFileQuery] = React.useState("")
  const [mobileTree, setMobileTree] = React.useState(true)
  const [confirmDiscard, setConfirmDiscard] = React.useState(false)
  const [compareOpen, setCompareOpen] = React.useState(false)
  const activeSession = getActiveSession(state, worktree.id)

  React.useEffect(() => {
    if (!focusFileId) return
    const target = state.files.find(
      (item) => item.id === focusFileId && item.worktreeId === worktree.id,
    )
    if (target) {
      dispatch({ type: "SELECT_FILE", worktreeId: worktree.id, fileId: focusFileId })
      // Deep link should open the file pane directly on mobile.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMobileTree(false)
    }
  }, [focusFileId, state.files, dispatch, worktree.id])

  React.useEffect(() => {
    if (file) dispatch({ type: "OPEN_FILE_BUFFER", fileId: file.id })
  }, [file, dispatch])

  const buffer = file ? state.ui.fileBuffers[file.id] : null
  const editable = file && !file.binary && !isLargeFile(file) && !file.unavailable
  const tree = filterFileTree(buildFileTree(files), fileQuery)

  function selectFile(next: DemoFile) {
    dispatch({ type: "SELECT_FILE", worktreeId: worktree.id, fileId: next.id })
    dispatch({ type: "OPEN_FILE_BUFFER", fileId: next.id })
    setMobileTree(false)
    setMode("view")
  }

  function save() {
    if (!file || !buffer) return
    if (file.version !== buffer.baseVersion) {
      dispatch({ type: "SAVE_FILE", fileId: file.id })
      toast.error("Salvamento bloqueado: o arquivo mudou desde que foi aberto.", {
        description: "Compare as versões ou recarregue o disco. Seu buffer foi preservado.",
      })
      return
    }
    dispatch({ type: "SAVE_FILE", fileId: file.id })
    toast.success("Arquivo salvo apenas em memória.", {
      description: "Nenhum arquivo real foi gravado; recarregar a página reinicia a fixture.",
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "relative flex flex-col gap-1.5 border-b bg-card px-3 py-2",
          !panel && "md:flex-row md:flex-wrap md:items-center md:gap-2",
        )}
      >
        <div className={cn("w-full min-w-0", !panel && "md:w-auto md:flex-1")}>
          <p className="truncate text-xs font-semibold">
            {file?.path ?? "Arquivos do worktree"}
            {file && <span className="ml-2 font-mono font-normal text-muted-foreground">v{file.version}</span>}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {worktree.branch} · {worktree.path} · edição em memória
          </p>
        </div>
        {panel && onClose && (
          <Button
            size="icon-sm"
            variant="ghost"
            className="absolute top-2 right-2 size-7 text-muted-foreground"
            onClick={onClose}
            aria-label="Fechar painel de arquivo"
          >
            <X />
          </Button>
        )}
        {file && (
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <div className="flex rounded-md border p-0.5" role="tablist" aria-label="Modo de arquivo">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "view"}
                className={cn("rounded px-2 py-1 text-[11px]", mode === "view" && "bg-secondary font-medium")}
                onClick={() => setMode("view")}
              >
                Visualizar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "diff"}
                className={cn("rounded px-2 py-1 text-[11px]", mode === "diff" && "bg-secondary font-medium")}
                onClick={() => setMode("diff")}
              >
                <GitCompare className="mr-1 inline size-3" /> Diff
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "edit"}
                className={cn(
                  "rounded px-2 py-1 text-[11px]",
                  mode === "edit" && "bg-secondary font-medium",
                  !editable && "opacity-50",
                )}
                onClick={() => {
                  if (!editable) return
                  dispatch({ type: "OPEN_FILE_BUFFER", fileId: file.id })
                  setMode("edit")
                }}
                title={editable ? "Editar buffer em memória" : "Arquivo não editável nesta fixture"}
              >
                <Pencil className="mr-1 inline size-3" /> Editar
              </button>
            </div>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                if (!activeSession) return
                dispatch({
                  type: "ADD_SOURCE",
                  sessionId: activeSession.id,
                  source: sourceForFile(file),
                })
                toast.success("Arquivo adicionado ao rascunho da sessão ativa.")
              }}
              disabled={!activeSession}
            >
              Mencionar no chat
            </Button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1",
          panel ? "grid-cols-1" : "md:grid-cols-[240px_minmax(0,1fr)]",
        )}
      >
        {!panel && (
          <aside
            className={cn(
              "thin-scrollbar min-h-0 overflow-y-auto border-r bg-slate-50/50 p-2 md:block",
              mobileTree ? "block" : "hidden",
            )}
            aria-label="Árvore de arquivos"
          >
            <p className="px-1 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Arquivos · {files.length}
            </p>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={fileQuery}
                onChange={(event) => setFileQuery(event.target.value)}
                placeholder="Buscar arquivo"
                aria-label="Buscar arquivo no worktree"
                className="h-7 pr-7 pl-7 text-xs"
              />
              {fileQuery && (
                <button
                  type="button"
                  onClick={() => setFileQuery("")}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label="Limpar busca de arquivo"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            {tree.length > 0 ? (
              <FileTree nodes={tree} selectedId={file?.id ?? null} onSelect={selectFile} />
            ) : (
              <p className="px-1.5 py-3 text-[11px] text-muted-foreground">
                Nenhum arquivo encontrado.
              </p>
            )}
            <p className="mt-3 border-t px-1 pt-2 text-[10px] leading-relaxed text-muted-foreground">
              Criar, apagar e renomear arquivos fica para uma fase posterior. O explorador não lê o
              filesystem do host.
            </p>
          </aside>
        )}

        <section
          className={cn(
            "min-h-0 p-2 sm:p-3",
            panel ? "flex flex-1 flex-col overflow-hidden" : "thin-scrollbar overflow-y-auto md:block",
            !panel && (mobileTree ? "hidden" : "block"),
          )}
          aria-label="Conteúdo do arquivo"
        >
          <div className={cn("mb-2 flex items-center gap-2", panel ? "hidden" : "md:hidden")}>
            <Button size="xs" variant="ghost" onClick={() => setMobileTree(true)}>
              <ArrowLeft /> Árvore
            </Button>
            <span className="truncate font-mono text-[11px]">{file?.path}</span>
          </div>

          {!file && (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Nenhum arquivo nesta fixture.
            </div>
          )}

          {file && file.unavailable && (
            <Alert variant="warning" className="mb-2">
              <div>
                <p className="font-medium">Conteúdo indisponível</p>
                <p>
                  A fixture não permite carregar <code>{file.path}</code>. Nenhuma substituição
                  silenciosa por outro checkout é feita.
                </p>
              </div>
            </Alert>
          )}

          {file && file.binary && (
            <Alert variant="info" className="mb-2">
              <div>
                <p className="font-medium">Arquivo binário</p>
                <p>
                  {file.path} · {fileSizeLabel(file)}. Não há edição de binário neste demo; nenhum
                  conteúdo é decodificado.
                </p>
              </div>
            </Alert>
          )}

          {file && isLargeFile(file) && (
            <Alert variant="warning" className="mb-2">
              <div>
                <p className="flex items-center gap-1 font-medium">
                  <HardDrive className="size-3.5" /> Arquivo grande
                </p>
                <p>
                  {file.path} · {fileSizeLabel(file)}. O editor não carrega conteúdo grande
                  automaticamente; seria necessário um recorte explícito.
                </p>
              </div>
            </Alert>
          )}

          {file && editable && (
            <>
              {buffer?.conflict && (
                <Alert variant="danger" className="mb-2">
                  <div className="flex-1">
                    <p className="font-medium">O arquivo mudou no ambiente desde que foi aberto.</p>
                    <p className="mt-0.5">
                      Seu buffer humano foi preservado. Salvar está bloqueado até você comparar ou
                      recarregar o disco.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="xs" variant="outline" onClick={() => setCompareOpen(true)}>
                        Comparar versões
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          dispatch({ type: "RELOAD_FILE_BUFFER", fileId: file.id })
                          toast.info("Buffer recarregado a partir do disco simulado. Sua edição foi descartada.")
                        }}
                      >
                        <RefreshCw /> Recarregar disco
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setCompareOpen(true)}>
                        Continuar só com meu buffer
                      </Button>
                    </div>
                  </div>
                </Alert>
              )}

              {mode !== "diff" && (
                <div className={panel ? "flex min-h-0 flex-1 flex-col" : undefined}>
                  {mode === "edit" && (
                    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 px-2 py-1.5">
                      <span className="text-[11px]">
                        {buffer?.dirty ? (
                          <span className="font-medium text-amber-800">buffer modificado, não salvo</span>
                        ) : (
                          <span className="text-muted-foreground">sem alterações no buffer</span>
                        )}
                      </span>
                      <div className="ml-auto flex flex-wrap gap-1.5">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            dispatch({ type: "SIMULATE_EXTERNAL_CHANGE", fileId: file.id })
                          }
                        >
                          Simular mudança externa
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          disabled={!buffer?.dirty}
                          onClick={() => setConfirmDiscard(true)}
                        >
                          Descartar buffer
                        </Button>
                        <Button
                          size="xs"
                          onClick={save}
                          disabled={!buffer?.dirty || buffer.conflict}
                          title="Salva apenas na memória; conflito bloqueia a escrita"
                        >
                          <Save /> Salvar
                        </Button>
                      </div>
                    </div>
                  )}
                  <div
                    className={
                      panel
                        ? "min-h-0 flex-1"
                        : "h-[calc(100dvh-300px)] min-h-64 md:h-[calc(100dvh-286px)]"
                    }
                  >
                    <CodeEditor
                      key={`${file.id}-${mode}`}
                      value={mode === "edit" ? (buffer?.content ?? file.content) : file.content}
                      onChange={
                        mode === "edit"
                          ? (value) =>
                              dispatch({ type: "UPDATE_FILE_BUFFER", fileId: file.id, content: value })
                          : undefined
                      }
                      readOnly={mode !== "edit"}
                      language={file.language}
                      ariaLabel={`Arquivo ${file.path}`}
                    />
                  </div>
                </div>
              )}
              {mode === "diff" && (
                <div className={panel ? "min-h-0 flex-1 overflow-y-auto" : undefined}>
                  <DiffView file={file} />
                </div>
              )}
            </>
          )}

          {file && !editable && !file.unavailable && (
            <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
              Visualização e diff estão disponíveis; edição não é oferecida para este tipo de
              arquivo.
            </div>
          )}
        </section>
      </div>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Comparar versões · {file?.path}</DialogTitle>
            <DialogDescription>
              O buffer humano não foi sobrescrito. Escolha explicitamente qual versão continuar.
            </DialogDescription>
          </DialogHeader>
          {file && buffer && (
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold">
                  Meu buffer · base v{buffer.baseVersion}
                </p>
                <pre className="max-h-72 overflow-auto rounded-md border bg-slate-50 p-2 font-mono text-[10px] whitespace-pre-wrap">
                  {buffer.content}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold">
                  Disco simulado · v{buffer.externalVersion ?? file.version}
                </p>
                <pre className="max-h-72 overflow-auto rounded-md border bg-slate-50 p-2 font-mono text-[10px] whitespace-pre-wrap">
                  {buffer.externalContent ?? file.content}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (file) dispatch({ type: "RELOAD_FILE_BUFFER", fileId: file.id })
                setCompareOpen(false)
              }}
            >
              Usar versão do disco
            </Button>
            <Button
              onClick={() => {
                setCompareOpen(false)
                toast.info("Buffer preservado. O salvamento continua bloqueado até recarregar o disco.")
              }}
            >
              Manter meu buffer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Descartar o buffer?</DialogTitle>
            <DialogDescription>
              As alterações feitas nesta sessão serão perdidas. O arquivo fictício no disco simulado
              não muda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscard(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (file) dispatch({ type: "DISCARD_FILE_BUFFER", fileId: file.id })
                setConfirmDiscard(false)
                toast.info("Buffer descartado.")
              }}
            >
              <Trash2 /> Descartar buffer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
