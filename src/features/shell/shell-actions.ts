import * as React from "react"

export type ShellActionsValue = {
  openSearch: () => void
  openGuide: () => void
  openAbout: () => void
}

export const ShellActionsContext = React.createContext<ShellActionsValue | null>(null)

export function useShellActions() {
  const value = React.useContext(ShellActionsContext)
  if (!value) {
    throw new Error("useShellActions precisa ser usado dentro do AppShell")
  }
  return value
}
