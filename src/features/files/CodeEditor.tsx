import * as React from "react"
import { basicSetup } from "codemirror"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { php } from "@codemirror/lang-php"
import { EditorState, type Extension } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"

import type { DemoFile } from "@/demo/types"

function languageExtension(language: DemoFile["language"]): Extension {
  switch (language) {
    case "php":
      return php()
    case "typescript":
      return javascript({ typescript: true })
    case "json":
      return json()
    case "markdown":
      return markdown()
    default:
      return []
  }
}

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  language,
  ariaLabel,
}: {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  language: DemoFile["language"]
  ariaLabel: string
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const viewRef = React.useRef<EditorView | null>(null)
  const onChangeRef = React.useRef(onChange)
  const valueRef = React.useRef(value)

  React.useEffect(() => {
    onChangeRef.current = onChange
    valueRef.current = value
  }, [onChange, value])

  React.useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: [
          basicSetup,
          history(),
          languageExtension(language),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": ariaLabel, "data-testid": "code-editor" }),
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !readOnly) {
              onChangeRef.current?.(update.state.doc.toString())
            }
          }),
          keymap.of([...historyKeymap, ...defaultKeymap]),
        ],
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Created once per mounted file; parent uses key={file.id}.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
    }
  }, [value])

  return <div ref={containerRef} className="h-full w-full overflow-hidden rounded-md border bg-card" />
}
