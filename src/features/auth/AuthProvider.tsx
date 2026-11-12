import * as React from "react"

import type { AuthSnapshot, SetupRequest } from "@shared/auth"
import { AUTH_LIMITS } from "@shared/auth"

import { ApiClientError, authApi } from "./api"

type AuthStatus = "loading" | "setup" | "anonymous" | "authenticated" | "expired" | "error"

interface AuthContextValue {
  status: AuthStatus
  snapshot: AuthSnapshot | null
  expired: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  bootstrap: (body: SetupRequest) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  updateSession: (session: AuthSnapshot["session"]) => void
  updateDevice: (device: AuthSnapshot["device"]) => void
  sendActivity: () => Promise<void>
  dismissExpired: () => void
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("loading")
  const [snapshot, setSnapshot] = React.useState<AuthSnapshot | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const lastActivitySent = React.useRef(0)

  const refresh = React.useCallback(async () => {
    setError(null)
    try {
      const setup = await authApi.setupStatus()
      if (setup.required) {
        setStatus("setup")
        setSnapshot(null)
        return
      }
      try {
        const session = await authApi.session()
        if ("authenticated" in session) {
          setSnapshot(null)
          setStatus("anonymous")
          return
        }
        setSnapshot(session)
        setStatus("authenticated")
      } catch (sessionError) {
        if (sessionError instanceof ApiClientError && sessionError.status === 401) {
          setSnapshot(null)
          setStatus("anonymous")
          return
        }
        throw sessionError
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a sessão.",
      )
      setStatus("error")
    }
  }, [])

  React.useEffect(() => {
    // A sessão é um sistema externo; o carregamento inicial define o estado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    function onUnauthorized(event: Event) {
      const detail = (event as CustomEvent<{ code?: string; message?: string }>).detail
      setError(detail?.message ?? "Sua sessão expirou.")
      setStatus((current) => (current === "authenticated" ? "expired" : current))
    }
    window.addEventListener("brain:auth-required", onUnauthorized)
    return () => window.removeEventListener("brain:auth-required", onUnauthorized)
  }, [])

  const login = React.useCallback(async (email: string, password: string) => {
    const session = await authApi.login({ email, password })
    setSnapshot(session)
    setStatus("authenticated")
    setError(null)
  }, [])

  const bootstrap = React.useCallback(async (body: SetupRequest) => {
    await authApi.bootstrap(body)
    setStatus("anonymous")
    setSnapshot(null)
  }, [])

  const logout = React.useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setSnapshot(null)
      setStatus("anonymous")
      setError(null)
    }
  }, [])

  const updateSession = React.useCallback((session: AuthSnapshot["session"]) => {
    setSnapshot((current) => (current ? { ...current, session } : current))
  }, [])

  const updateDevice = React.useCallback((device: AuthSnapshot["device"]) => {
    setSnapshot((current) => (current ? { ...current, device } : current))
  }, [])

  const dismissExpired = React.useCallback(() => {
    setSnapshot(null)
    setStatus("anonymous")
    setError(null)
  }, [])

  const sendActivity = React.useCallback(async () => {
    const now = Date.now()
    if (now - lastActivitySent.current < AUTH_LIMITS.activityMinIntervalMs) return
    lastActivitySent.current = now
    try {
      const activity = await authApi.activity()
      setSnapshot((current) =>
        current
          ? {
              ...current,
              session: {
                ...current.session,
                expiresAt: activity.expiresAt,
                absoluteExpiresAt: activity.absoluteExpiresAt,
                lastActivityAt: new Date().toISOString(),
              },
            }
          : current,
      )
    } catch {
      // A próxima ação autenticada ou o diálogo de expiração resolve o estado.
    }
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      snapshot,
      expired: status === "expired",
      error,
      login,
      bootstrap,
      logout,
      refresh,
      updateSession,
      updateDevice,
      sendActivity,
      dismissExpired,
    }),
    [
      status,
      snapshot,
      error,
      login,
      bootstrap,
      logout,
      refresh,
      updateSession,
      updateDevice,
      sendActivity,
      dismissExpired,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider")
  return context
}

export function useActivitySignal() {
  const { status, sendActivity } = useAuth()
  React.useEffect(() => {
    if (status !== "authenticated") return
    const onGesture = () => {
      void sendActivity()
    }
    window.addEventListener("pointerdown", onGesture, { passive: true })
    window.addEventListener("keydown", onGesture)
    return () => {
      window.removeEventListener("pointerdown", onGesture)
      window.removeEventListener("keydown", onGesture)
    }
  }, [status, sendActivity])
}
