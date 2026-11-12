import { AUTH_LIMITS } from "../../../shared/auth.js"

export interface SessionDeadlines {
  expiresAt: Date
  absoluteExpiresAt: Date
}

export interface SessionTimestamps {
  createdAt: Date
  expiresAt: Date
  absoluteExpiresAt: Date
  lastAuthAt: Date
  trusted: boolean
}

/** Confiança válida existe apenas se nunca foi revogada e ainda não venceu. */
export function isTrustValid(
  device: { trustedUntil: Date | null; revokedAt: Date | null } | null | undefined,
  now: Date,
): boolean {
  if (!device || device.revokedAt) return false
  if (!device.trustedUntil) return false
  return device.trustedUntil.getTime() > now.getTime()
}

/** Prazos de uma sessão recém-criada, sempre pelo primeiro limite atingido. */
export function newSessionDeadlines(
  now: Date,
  loginAt: Date,
  trusted: boolean,
): SessionDeadlines {
  const idle = trusted ? AUTH_LIMITS.trustedIdleMs : AUTH_LIMITS.untrustedIdleMs
  const absolute = trusted ? AUTH_LIMITS.trustedAbsoluteMs : AUTH_LIMITS.untrustedAbsoluteMs
  const absoluteExpiresAt = new Date(loginAt.getTime() + absolute)
  const idleExpiresAt = new Date(now.getTime() + idle)
  return { expiresAt: earliest(idleExpiresAt, absoluteExpiresAt), absoluteExpiresAt }
}

/**
 * Atividade humana explícita. Nunca altera o teto absoluto e nunca ultrapassa
 * o primeiro limite.
 */
export function extendSessionActivity(
  now: Date,
  trusted: boolean,
  absoluteExpiresAt: Date,
): SessionDeadlines {
  const idle = trusted ? AUTH_LIMITS.trustedIdleMs : AUTH_LIMITS.untrustedIdleMs
  const idleExpiresAt = new Date(now.getTime() + idle)
  return {
    expiresAt: earliest(idleExpiresAt, absoluteExpiresAt),
    absoluteExpiresAt,
  }
}

/**
 * Conceder confiança promove a sessão existente. O teto absoluto continua
 * contado desde o login original, nunca desde a concessão.
 */
export function promoteSessionToTrusted(now: Date, createdAt: Date): SessionDeadlines {
  const absoluteExpiresAt = new Date(createdAt.getTime() + AUTH_LIMITS.trustedAbsoluteMs)
  const idleExpiresAt = new Date(now.getTime() + AUTH_LIMITS.trustedIdleMs)
  return { expiresAt: earliest(idleExpiresAt, absoluteExpiresAt), absoluteExpiresAt }
}

export function trustUntilFrom(now: Date): Date {
  return new Date(now.getTime() + AUTH_LIMITS.trustValidityMs)
}

export function isSessionValid(
  session: Pick<SessionTimestamps, "expiresAt" | "absoluteExpiresAt" | "createdAt">,
  now: Date,
): boolean {
  if (session.absoluteExpiresAt.getTime() <= session.createdAt.getTime()) return false
  if (session.expiresAt.getTime() > session.absoluteExpiresAt.getTime()) return false
  return now.getTime() < session.expiresAt.getTime() && now.getTime() < session.absoluteExpiresAt.getTime()
}

export function isRecentAuth(lastAuthAt: Date, now: Date): boolean {
  return now.getTime() - lastAuthAt.getTime() <= AUTH_LIMITS.recentAuthMs
}

export function isActivityThrottled(lastActivityAt: Date, now: Date): boolean {
  return now.getTime() - lastActivityAt.getTime() < AUTH_LIMITS.activityMinIntervalMs
}

function earliest(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b
}
