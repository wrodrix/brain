"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/form"
import { cn } from "@/lib/utils"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex w-full min-w-0 flex-col rounded-2xl border border-border bg-card shadow-xs transition-[color,box-shadow] outline-none",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
        "has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:flex-col",
        className,
      )}
      {...props}
    />
  )
}

const addonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-2",
        "inline-end": "order-last pr-2",
        "block-start": "order-first w-full justify-start px-2.5 pt-2",
        "block-end": "order-last w-full justify-start px-2.5 pb-2",
      },
    },
    defaultVariants: { align: "inline-start" },
  },
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof addonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(addonVariants({ align }), className)}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) return
        const control = event.currentTarget.parentElement?.querySelector<HTMLElement>(
          "[data-slot=input-group-control]",
        )
        control?.focus()
      }}
      {...props}
    />
  )
}

const buttonVariants = cva("flex items-center gap-2 rounded-xl text-sm shadow-none", {
  variants: {
    size: {
      xs: "h-6 gap-1 px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
      sm: "h-8 px-2.5",
      "icon-xs": "size-6 rounded-lg p-0 has-[>svg]:p-0",
      "icon-sm": "size-8 rounded-full p-0 has-[>svg]:p-0",
    },
  },
  defaultVariants: { size: "xs" },
})

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof buttonVariants> & { type?: "button" | "submit" | "reset" }) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(buttonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn("flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0", className)}
      {...props}
    />
  )
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
}
