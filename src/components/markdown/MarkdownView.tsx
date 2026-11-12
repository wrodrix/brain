import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import { cn } from "@/lib/utils"

function nodeToText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeToText).join("")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return nodeToText(node.props.children)
  }
  return ""
}

function extractLanguage(children: React.ReactNode): string | null {
  const child = React.Children.toArray(children)[0]
  if (React.isValidElement<{ className?: string }>(child)) {
    const match = /language-([\w-]+)/.exec(child.props.className ?? "")
    return match?.[1] ?? null
  }
  return null
}

export function MarkdownView({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <div className={cn("prose-demo text-sm", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ children, href }) => (
            <span
              className="text-primary underline decoration-primary/40 underline-offset-2"
              title={`Link externo não aberto no demo${href ? `: ${href}` : ""}`}
            >
              {children}
            </span>
          ),
          img: () => (
            <span className="inline-flex rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-500">
              Imagem não carregada — recursos externos bloqueados
            </span>
          ),
          pre: ({ children }) => {
            const language = extractLanguage(children)
            const value = nodeToText(children)
            return (
              <CodeBlock size="sm" className="my-3">
                <CodeBlockHeader>
                  <CodeBlockTitle>{language ?? "texto"}</CodeBlockTitle>
                  <CodeBlockActions>
                    <CodeBlockCopyButton value={value} />
                  </CodeBlockActions>
                </CodeBlockHeader>
                <CodeBlockContent wrap>{value}</CodeBlockContent>
              </CodeBlock>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
