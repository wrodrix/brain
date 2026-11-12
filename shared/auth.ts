export const MINUTE_MS = 60_000
export const DAY_MS = 24 * 60 * 60_000

export const AUTH_LIMITS = {
  untrustedIdleMs: 15 * MINUTE_MS,
  untrustedAbsoluteMs: 60 * MINUTE_MS,
  trustedIdleMs: 30 * DAY_MS,
  trustedAbsoluteMs: 90 * DAY_MS,
  trustValidityMs: 90 * DAY_MS,
  recentAuthMs: 10 * MINUTE_MS,
  activityMinIntervalMs: 30_000,
  passwordMinLength: 8,
  passwordMaxLength: 128,
  setupTokenTtlHours: 24,
} as const

export const AUTH_ERROR_CODES = [
  "UNAUTHENTICATED",
  "SESSION_EXPIRED",
  "SESSION_REVOKED",
  "SESSION_INCOMPLETE",
  "DEVICE_MISMATCH",
  "REAUTH_REQUIRED",
  "SETUP_REQUIRED",
  "SETUP_COMPLETE",
  "INVALID_SETUP_TOKEN",
  "INVALID_CREDENTIALS",
  "RATE_LIMITED",
  "FORBIDDEN_ORIGIN",
  "DB_UNAVAILABLE",
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "INTERNAL",
] as const

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number]

export interface AuthErrorBody {
  error: {
    code: AuthErrorCode
    message: string
    requestId?: string
  }
}

export interface PublicUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
}

export interface SessionView {
  id: string
  createdAt: string
  expiresAt: string
  absoluteExpiresAt: string
  lastAuthAt: string
  lastActivityAt: string
  trusted: boolean
  deviceId: string
  userAgent: string | null
  ipAddress: string | null
}

export interface DeviceView {
  id: string
  label: string
  userAgent: string | null
  trustedUntil: string | null
  createdAt: string
  lastSeenAt: string
}

export interface SessionSummary {
  id: string
  current: boolean
  trusted: boolean
  createdAt: string
  expiresAt: string
  absoluteExpiresAt: string
  lastActivityAt: string
  device: DeviceView | null
}

export interface AuthSnapshot {
  user: PublicUser
  session: SessionView
  device: DeviceView
}

export type SessionCheck = AuthSnapshot | { authenticated: false }

export interface LoginRequest {
  email: string
  password: string
}

export interface SetupRequest {
  token: string
  name: string
  email: string
  password: string
}

export interface ReauthRequest {
  password: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ActivityResponse {
  expiresAt: string
  absoluteExpiresAt: string
}
