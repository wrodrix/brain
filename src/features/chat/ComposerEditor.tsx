import * as React from "react"
import {
  autocompletion,
  type Completion,
  type CompletionSource,
} from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { Compartment, EditorState, type Extension } from "@codemirror/state"
import {
  Decoration,
  EditorView,
  drawSelection,
  dropCursor,
  highlightSpecialChars,
  keymap,
  placeholder,
  type DecorationSet,
} from "@codemirror/view"

import type { SourceRef } from "@/demo/types"
import { collectMarkdownDecorations } from "./markdown-decorations"
import { shouldOpenMention } from "./mention"

export interface MentionData {
  files: Array<{ source: SourceRef; error?: string }>
  issues: SourceRef[]
  people: SourceRef[]
}

interface MentionCompletion extends Completion {
  source?: SourceRef
}

function buildDecorations(text: string): DecorationSet {
  const ranges = collectMarkdownDecorations(text).map((range) =>
    range.kind === "line"
      ? Decoration.line({ class: range.className }).range(range.from)
      : range.kind === "hide"
        ? Decoration.replace({}).range(range.from, range.to)
        : Decoration.mark({ class: range.className }).range(range.from, range.to),
  )
  return Decoration.set(ranges, true)
}

const liveMarkdownExtension: Extension = EditorView.decorations.compute(["doc"], (state) =>
  buildDecorations(state.doc.toString()),
)

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

interface ComposerEditorProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onAddSource: (source: SourceRef) => void
  onAttachFiles?: (files: File[]) => void
  mentionData: MentionData
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
}

export function ComposerEditor({
  value,
  onChange,
  onSubmit,
  onAddSource,
  onAttachFiles,
  mentionData,
  placeholder: placeholderText = "Escreva uma mensagem… Markdown é formatado durante a digitação.",
  ariaLabel = "Mensagem com Markdown e menções",
  disabled = false,
}: ComposerEditorProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const viewRef = React.useRef<EditorView | null>(null)
  const valueRef = React.useRef(value)
  const onChangeRef = React.useRef(onChange)
  const onSubmitRef = React.useRef(onSubmit)
  const onAddSourceRef = React.useRef(onAddSource)
  const onAttachFilesRef = React.useRef(onAttachFiles)
  const mentionRef = React.useRef(mentionData)
  const editableCompartment = React.useMemo(() => new Compartment(), [])

  React.useEffect(() => {
    valueRef.current = value
    onChangeRef.current = onChange
    onSubmitRef.current = onSubmit
    onAddSourceRef.current = onAddSource
    onAttachFilesRef.current = onAttachFiles
    mentionRef.current = mentionData
  }, [value, onChange, onSubmit, onAddSource, onAttachFiles, mentionData])

  const mentionSource = React.useMemo<CompletionSource>(
    () => (context) => {
      const word = context.matchBefore(/[@#][^@#\s]*$/)
      if (!word || (word.from === word.to && !context.explicit)) return null
      if (!context.explicit && !shouldOpenMention(context.state.doc.toString(), context.pos)) {
        return null
      }
      const trigger = word.text[0]
      const query = normalize(word.text.slice(1))
      const data = mentionRef.current
      const raw: MentionCompletion[] =
        trigger === "#"
          ? data.issues.map((source) => ({
              label: `#${source.issueNumber ?? ""}`,
              detail: source.detail,
              type: "keyword",
              source,
            }))
          : [
              ...data.files.map(({ source, error }) => ({
                label: `@${source.path?.split("/").at(-1) ?? source.label}`,
                detail: error ? `${source.detail} · ${error}` : source.detail,
                type: "text",
                source,
              })),
              ...data.people.map((source) => ({
                label: `@${source.label.split(" ")[0]?.toLowerCase()}`,
                detail: source.detail,
                type: "variable",
                source,
              })),
            ]
      const filtered = raw
        .filter((item) => {
          if (!query) return true
          return normalize(`${item.label} ${item.detail ?? ""}`).includes(query)
        })
        .slice(0, 24)
      if (filtered.length === 0) {
        return {
          from: word.from,
          options: [
            {
              label: word.text,
              detail: "Nenhuma fonte encontrada",
              apply: () => undefined,
            },
          ],
        }
      }
      return {
        from: word.from,
        options: filtered.map((item) => ({
          ...item,
          apply: (view, _completion, from, to) => {
            view.dispatch({
              changes: { from, to, insert: item.label },
              selection: { anchor: from + item.label.length },
            })
            if (item.source) onAddSourceRef.current(item.source)
            view.focus()
          },
        })),
        validFor: /^[@#][^@#\s]*$/,
      }
    },
    [],
  )

  React.useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: [
          history(),
          drawSelection(),
          dropCursor(),
          highlightSpecialChars(),
          EditorView.lineWrapping,
          EditorState.tabSize.of(2),
          placeholder(placeholderText),
          liveMarkdownExtension,
          EditorView.domEventHandlers({
            paste: (event) => {
              const files = Array.from(event.clipboardData?.files ?? [])
              if (files.length === 0) return false
              event.preventDefault()
              onAttachFilesRef.current?.(files)
              return true
            },
            drop: (event) => {
              const files = Array.from(event.dataTransfer?.files ?? [])
              if (files.length === 0) return false
              event.preventDefault()
              onAttachFilesRef.current?.(files)
              return true
            },
          }),
          autocompletion({ override: [mentionSource], activateOnTyping: true }),
          editableCompartment.of([
            EditorState.readOnly.of(disabled),
            EditorView.editable.of(!disabled),
          ]),
          EditorView.contentAttributes.of({
            "aria-label": ariaLabel,
            "aria-multiline": "true",
            "data-testid": "composer-editor",
            "data-slot": "input-group-control",
            spellcheck: "true",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                onSubmitRef.current()
                return true
              },
            },
            ...historyKeymap,
            ...defaultKeymap,
          ]),
        ],
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // The editor instance is intentionally created once; latest props live in refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: editableCompartment.reconfigure([
        EditorState.readOnly.of(disabled),
        EditorView.editable.of(!disabled),
      ]),
    })
  }, [disabled, editableCompartment])

  React.useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (value !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  return <div ref={containerRef} className="composer-editor h-full w-full" />
}
