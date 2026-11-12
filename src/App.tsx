import { Link, Route, Routes } from "react-router-dom"
import { Compass } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppShell } from "@/features/shell/AppShell"
import { ProjectPage } from "@/features/projects/ProjectPage"
import { ProjectsPage } from "@/features/projects/ProjectsPage"
import { SettingsPage } from "@/features/settings/SettingsPage"
import { UsagePage } from "@/features/usage/UsagePage"
import { WorkbenchPage } from "@/features/workbench/WorkbenchPage"

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

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
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
