"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const codeBlockVariants = cva(
  "group/code-block relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-slate-50 text-sm",
  {
    variants: {
      variant: {
        default: "",
        destructive: "border-destructive/25 bg-destructive/5 text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

function CodeBlock({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof codeBlockVariants> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="code-block"
      data-variant={variant}
      data-size={size}
      className={cn(codeBlockVariants({ variant }), className)}
      {...props}
    />
  )
}

function CodeBlockHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-header"
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-2 border-b border-border/70 px-3 py-1.5 text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

function CodeBlockTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-title"
      className={cn("min-w-0 truncate font-mono text-[11px] font-medium text-muted-foreground", className)}
      {...props}
    />
  )
}

function CodeBlockActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="code-block-actions" className={cn("ms-auto flex shrink-0 items-center gap-1", className)} {...props} />
  )
}

function CodeBlockCopyButton({
  value,
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button> & { value: string }) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <>
      <Button
        data-slot="code-block-copy-button"
        data-copied={copied || undefined}
        variant="ghost"
        size="icon-sm"
        aria-label={copied ? "Copiado" : "Copiar código"}
        className={cn("size-6 text-muted-foreground hover:bg-foreground/5 hover:text-foreground", className)}
        onClick={(event) => {
          onClick?.(event)
          navigator.clipboard
            .writeText(value)
            .then(() => setCopied(true))
            .catch(() => {})
        }}
        {...props}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Código copiado" : ""}
      </span>
    </>
  )
}

function CodeBlockContent({
  className,
  children,
  wrap = false,
  ...props
}: React.ComponentProps<"pre"> & { wrap?: boolean }) {
  return (
    <pre
      data-slot="code-block-content"
      data-wrap={wrap || undefined}
      dir="ltr"
      tabIndex={0}
      className={cn(
        "thin-scrollbar min-h-0 min-w-0 overflow-auto px-3.5 py-3 text-start font-mono text-[12.5px] leading-relaxed text-slate-700 outline-none",
        wrap && "whitespace-pre-wrap wrap-break-word",
        className,
      )}
      {...props}
    >
      <code data-slot="code-block-code" className={wrap ? "min-w-0" : "min-w-max"}>
        {children}
      </code>
    </pre>
  )
}

function CodeBlockFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-footer"
      className={cn("flex min-w-0 shrink-0 items-center gap-2 border-t border-border/70 px-3 py-1.5 text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockTitle,
}
