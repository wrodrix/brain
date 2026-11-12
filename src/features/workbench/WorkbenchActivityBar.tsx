import type { LucideIcon } from "lucide-react"
import {
  CircleDot,
  Gauge,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
} from "lucide-react"
import { Link } from "react-router-dom"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type ActivityItem = {
  label: string
  icon: LucideIcon
  to?: string
  onClick?: () => void
  active?: boolean
}

export function WorkbenchActivityBar({
  sidebarCollapsed,
  onToggleSidebar,
  onSearch,
  onOpenIssue,
}: {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  onSearch: () => void
  onOpenIssue: () => void
}) {
  const items: ActivityItem[] = [
    { label: "Projetos", icon: LayoutGrid, to: "/", active: true },
    { label: "Buscar", icon: Search, onClick: onSearch },
    { label: "Issues", icon: CircleDot, onClick: onOpenIssue },
    { label: "Cotas", icon: Gauge, to: "/usage" },
    { label: "Configurações", icon: Settings, to: "/settings" },
  ]

  return (
    <nav
      aria-label="Menu do worktree"
      className="hidden w-11 shrink-0 flex-col items-center gap-0.5 border-r bg-card py-1.5 xl:flex"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            title={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
        </TooltipContent>
      </Tooltip>
      <div aria-hidden="true" className="my-1 h-px w-5 bg-border" />
      {items.map((item) => {
        const className = cn(
          "relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          item.active && "bg-accent text-accent-foreground",
        )
        const content = (
          <>
            {item.active && (
              <span
                aria-hidden="true"
                className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
              />
            )}
            <item.icon className="size-4" />
          </>
        )
        return (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>
              {item.to ? (
                <Link
                  to={item.to}
                  aria-label={item.label}
                  aria-current={item.active ? "page" : undefined}
                  className={className}
                >
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={item.onClick} aria-label={item.label} className={className}>
                  {content}
                </button>
              )}
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        )
      })}
    </nav>
  )
}
