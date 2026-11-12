import * as React from "react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  BookOpen,
  Brain,
  CircleDot,
  Gauge,
  Home,
  LayoutGrid,
  Menu,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDemo } from "@/demo/DemoProvider"
import { AboutDialog, GuidedDemoDialog } from "@/features/demo/AboutDialog"
import { DemoBanner } from "@/features/demo/DemoBanner"
import { AccountMenu } from "@/features/shell/AccountMenu"
import { ShellActionsContext } from "@/features/shell/shell-actions"
import { IssueOverlay } from "@/features/issues/IssueOverlay"
import { SearchDialog } from "@/features/search/SearchDialog"
import { cn } from "@/lib/utils"

function NavItem({
  to,
  children,
  onClick,
}: {
  to?: string
  children: React.ReactNode
  onClick?: () => void
}) {
  if (to) {
    return (
      <NavLink
        to={to}
        end={to === "/"}
        className={({ isActive }) =>
          cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            isActive
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
          )
        }
      >
        {children}
      </NavLink>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
    >
      {children}
    </button>
  )
}

function MobileNavLink({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium",
          isActive ? "text-primary" : "text-muted-foreground",
        )
      }
    >
      <Icon className="size-5" />
      {label}
    </NavLink>
  )
}

export function AppShell() {
  const { state, dispatch } = useDemo()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [aboutOpen, setAboutOpen] = React.useState(false)
  const [guideOpen, setGuideOpen] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const shellActions = React.useMemo(
    () => ({
      openSearch: () => setSearchOpen(true),
      openGuide: () => setGuideOpen(true),
      openAbout: () => setAboutOpen(true),
    }),
    [],
  )

  const worktreeMatch = /\/projects\/([^/]+)\/worktrees\/([^/?]+)/.exec(location.pathname)
  const projectId = worktreeMatch?.[1] ?? null
  const isWorkbench = Boolean(worktreeMatch)
  const issueToOpen =
    state.issues.find((issue) => issue.projectId === projectId && issue.state === "open") ??
    state.issues[0]

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <ShellActionsContext.Provider value={shellActions}>
      <div className="flex h-dvh flex-col overflow-hidden">
        <a
          href="#main-content"
          className="sr-only-focusable fixed top-1 left-1 z-[100] rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white"
        >
          Pular para o conteúdo
        </a>
        <DemoBanner onOpenAbout={() => setAboutOpen(true)} onOpenGuide={() => setGuideOpen(true)} />

        {!isWorkbench && (
          <header className="z-30 shrink-0 border-b bg-card/95 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-[1700px] items-center gap-2 px-2 sm:px-4">
              <Link
                to="/"
                className="flex items-center gap-2 rounded-md px-1.5 py-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Brain className="size-4" />
                </span>
                <span className="text-sm font-semibold tracking-tight">Brain</span>
                <Badge variant="warning" className="hidden sm:inline-flex">
                  demo
                </Badge>
              </Link>

              <nav className="ml-3 hidden items-center gap-0.5 lg:flex" aria-label="Navegação principal">
                <NavItem to="/">Projetos</NavItem>
                <NavItem onClick={() => setSearchOpen(true)}>Buscar sessões</NavItem>
                <NavItem
                  onClick={() =>
                    issueToOpen &&
                    dispatch({ type: "OPEN_ISSUE", issueId: issueToOpen.id, triggerLabel: "Cabeçalho" })
                  }
                >
                  Issues
                </NavItem>
                <NavItem to="/usage">Cotas</NavItem>
                <NavItem to="/settings">Configurações</NavItem>
              </nav>

              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden h-8 w-52 justify-start gap-2 text-muted-foreground md:flex"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="size-3.5" />
                  <span className="text-xs">Buscar sessões</span>
                  <kbd className="ml-auto rounded border bg-secondary px-1 font-mono text-[9px]">⌘K</kbd>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="md:hidden"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Buscar sessões"
                >
                  <Search />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    issueToOpen &&
                    dispatch({ type: "OPEN_ISSUE", issueId: issueToOpen.id, triggerLabel: "Cabeçalho" })
                  }
                  aria-label="Abrir issues"
                >
                  <CircleDot />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hidden sm:inline-flex"
                  onClick={() => setGuideOpen(true)}
                  aria-label="Abrir roteiro guiado"
                >
                  <BookOpen />
                </Button>

                <AccountMenu
                  onOpenGuide={() => setGuideOpen(true)}
                  onOpenAbout={() => setAboutOpen(true)}
                />

                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Abrir menu"
                >
                  <Menu />
                </Button>
              </div>
            </div>
          </header>
        )}

        <main
          id="main-content"
          className={cn(
            "min-h-0 flex-1",
            isWorkbench ? "overflow-hidden" : "overflow-y-auto pb-16 md:pb-0",
          )}
        >
          <div className={cn(isWorkbench ? "h-full" : "mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 sm:py-5")}>
            <Outlet />
          </div>
        </main>

        {!isWorkbench && (
            <nav
              className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
              aria-label="Navegação móvel"
            >
              <MobileNavLink to="/" icon={Home} label="Projetos" />
              <button
                type="button"
                className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="size-5" />
                Buscar
              </button>
              <button
                type="button"
                className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground"
                onClick={() =>
                  issueToOpen &&
                  dispatch({ type: "OPEN_ISSUE", issueId: issueToOpen.id, triggerLabel: "Navegação móvel" })
                }
              >
                <CircleDot className="size-5" />
                Issues
              </button>
              <button
                type="button"
                className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium text-muted-foreground"
                onClick={() => setMobileMenuOpen(true)}
              >
                <LayoutGrid className="size-5" />
                Mais
              </button>
            </nav>
        )}

        <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Mais</DialogTitle>
              <DialogDescription>Acesso global do demo. Nenhuma integração real.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1">
              {[
                { label: "Projetos", to: "/", icon: Home },
                { label: "Cotas e conexões", to: "/usage", icon: Gauge },
                { label: "Configurações", to: "/settings", icon: Settings },
              ].map((item) => (
                <Button
                  key={item.to}
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    navigate(item.to)
                    setMobileMenuOpen(false)
                  }}
                >
                  <item.icon /> {item.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setGuideOpen(true)
                }}
              >
                <BookOpen /> Roteiro guiado
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setAboutOpen(true)
                }}
              >
                <ShieldCheck /> Sobre a demonstração
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
        <GuidedDemoDialog
          open={guideOpen}
          onOpenChange={setGuideOpen}
          onNavigate={(to) => navigate(to)}
        />
        <IssueOverlay key={state.ui.resetCount} />
          <div className="sr-only" aria-live="polite">
            {state.ui.sim.playing ? "Simulação em reprodução" : "Simulação pausada"}
          </div>
      </div>
    </ShellActionsContext.Provider>
  )
}
