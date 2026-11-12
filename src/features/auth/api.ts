import type {
  ActivityResponse,
  AuthErrorBody,
  AuthErrorCode,
  AuthSnapshot,
  ChangePasswordRequest,
  LoginRequest,
  ReauthRequest,
  SessionSummary,
  SessionCheck,
  SetupRequest,
} from "@shared/auth"

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "ApiClientError"
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE"
  body?: unknown
  authEvent?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET"
  const headers: Record<string, string> = { accept: "application/json" }
  if (options.body !== undefined) headers["content-type"] = "application/json"

  const response = await fetch(path, {
    method,
    headers,
    credentials: "same-origin",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    let body: AuthErrorBody | null = null
    try {
      body = (await response.json()) as AuthErrorBody
    } catch {
      body = null
    }
    const code = body?.error?.code ?? "INTERNAL"
    const message = body?.error?.message ?? "Não foi possível concluir a operação."
    if (response.status === 401 && options.authEvent !== false) {
      window.dispatchEvent(
        new CustomEvent("brain:auth-required", {
          detail: { code, message },
        }),
      )
    }
    throw new ApiClientError(response.status, code, message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const authApi = {
  setupStatus: () =>
    request<{ required: boolean }>("/api/setup/status", { authEvent: false }),
  bootstrap: (body: SetupRequest) =>
    request<{ user: AuthSnapshot["user"] }>("/api/setup/bootstrap", {
      method: "POST",
      body,
      authEvent: false,
    }),
  login: (body: LoginRequest) =>
    request<AuthSnapshot>("/api/auth/login", {
      method: "POST",
      body,
      authEvent: false,
    }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  session: () =>
    request<SessionCheck>("/api/auth/session", { authEvent: false }),
  activity: () =>
    request<ActivityResponse>("/api/auth/activity", {
      method: "POST",
      body: {},
    }),
  reauth: (body: ReauthRequest) =>
    request<void>("/api/auth/reauth", { method: "POST", body }),
  sessions: () => request<{ sessions: SessionSummary[] }>("/api/sessions"),
  revokeSession: (id: string) =>
    request<void>(`/api/sessions/${encodeURIComponent(id)}/revoke`, {
      method: "POST",
      body: {},
    }),
  trustDevice: () =>
    request<{ session: AuthSnapshot["session"]; device: AuthSnapshot["device"] }>(
      "/api/devices/current/trust",
      { method: "POST", body: {} },
    ),
  revokeTrust: () =>
    request<void>("/api/devices/current/trust", { method: "DELETE" }),
  changePassword: (body: ChangePasswordRequest) =>
    request<void>("/api/account/password", { method: "POST", body }),
}
