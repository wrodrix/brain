import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { Compass } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppShell } from "@/features/shell/AppShell"
import { ProjectPage } from "@/features/projects/ProjectPage"
import { ProjectsPage } from "@/features/projects/ProjectsPage"
import { SettingsPage } from "@/features/settings/SettingsPage"
import { UsagePage } from "@/features/usage/UsagePage"
import { WorkbenchPage } from "@/features/workbench/WorkbenchPage"
import { LoginPage, SetupPage } from "@/features/auth/AuthPages"
import { SessionExpiredDialog } from "@/features/auth/SessionDialogs"
import { useActivitySignal, useAuth } from "@/features/auth/AuthProvider"

function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center">
      <Compass className="size-8 text-muted-foreground" />
      <h1 className="mt-3 text-lg font-semibold">Área não encontrada</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Este caminho não pertence ao cenário de demonstração.
      </p>
      <Button asChild className="mt-4">
        <Link to="/">Voltar aos projetos</Link>
      </Button>
    </div>
  )
}

function ProtectedShell() {
  const { status, error, refresh } = useAuth()
  const location = useLocation()
  useActivitySignal()

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Carregando sessão…
      </div>
    )
  }
  if (status === "setup") return <Navigate to="/setup" replace />
  if (status === "anonymous") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }
  if (status === "error") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center">
        <h1 className="text-lg font-semibold">Não foi possível validar a sessão</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => void refresh()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <>
      <AppShell />
      <SessionExpiredDialog />
    </>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="setup" element={<SetupPage />} />
      <Route element={<ProtectedShell />}>
        <Route index element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectPage />} />
        <Route
          path="projects/:projectId/worktrees/:worktreeId"
          element={<WorkbenchPage />}
        />
        <Route path="usage" element={<UsagePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
