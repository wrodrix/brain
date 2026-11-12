import { fromNodeHeaders } from "better-auth/node"
import { eq } from "drizzle-orm"
import type { FastifyReply, FastifyRequest } from "fastify"

import { auth } from "./auth.js"
import { config } from "../config.js"
import { DEVICE_COOKIE, deviceTokenMatches } from "./device.js"
import { isRecentAuth, isSessionValid } from "./policy.js"
import { db } from "../db/client.js"
import { device, session } from "../db/schema/index.js"
import { ApiError } from "../http/errors.js"

export const SESSION_COOKIE = "brain.session_token"

type SessionRow = typeof session.$inferSelect
type DeviceRow = typeof device.$inferSelect

export interface RequestAuth {
  user: { id: string; name: string; email: string; emailVerified: boolean; image: string | null }
  session: SessionRow
  device: DeviceRow
  sessionToken: string
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: RequestAuth
  }
}

export async function requireSession(
  request: FastifyRequest,
  reply: FastifyReply,
  now: Date,
): Promise<RequestAuth> {
  let resolved
  try {
    resolved = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
      query: { disableCookieCache: true },
    })
  } catch {
    throw new ApiError(
      503,
      "DB_UNAVAILABLE",
      "Não foi possível validar a sessão. Tente novamente.",
    )
  }

  if (!resolved) {
    const hadCookie = Boolean(request.cookies[SESSION_COOKIE])
    if (hadCookie) clearSessionCookie(reply)
    throw new ApiError(
      401,
      hadCookie ? "SESSION_EXPIRED" : "UNAUTHENTICATED",
      hadCookie ? "Sua sessão expirou. Entre novamente." : "Autenticação necessária.",
    )
  }

  const [row] = await db
    .select()
    .from(session)
    .where(eq(session.id, resolved.session.id))
    .limit(1)

  if (!row) {
    clearSessionCookie(reply)
    throw new ApiError(401, "SESSION_REVOKED", "Sua sessão não está mais ativa.")
  }

  if (
    !row.deviceId ||
    !row.absoluteExpiresAt ||
    !row.lastAuthAt ||
    !row.lastActivityAt
  ) {
    await db.delete(session).where(eq(session.id, row.id))
    clearSessionCookie(reply)
    throw new ApiError(401, "SESSION_INCOMPLETE", "Sessão inválida. Entre novamente.")
  }

  const absoluteExpiresAt = row.absoluteExpiresAt
  if (!isSessionValid({ createdAt: row.createdAt, expiresAt: row.expiresAt, absoluteExpiresAt }, now)) {
    await db.delete(session).where(eq(session.id, row.id))
    clearSessionCookie(reply)
    throw new ApiError(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.")
  }

  const [deviceRow] = await db
    .select()
    .from(device)
    .where(eq(device.id, row.deviceId))
    .limit(1)

  if (!deviceRow || deviceRow.userId !== resolved.user.id || deviceRow.revokedAt) {
    await db.delete(session).where(eq(session.id, row.id))
    clearSessionCookie(reply)
    throw new ApiError(401, "SESSION_REVOKED", "Sua sessão não está mais ativa.")
  }

  const deviceToken = request.cookies[DEVICE_COOKIE]
  if (!deviceToken || !deviceTokenMatches(deviceToken, deviceRow.tokenHash)) {
    throw new ApiError(
      401,
      "DEVICE_MISMATCH",
      "Esta sessão não corresponde a este navegador. Entre novamente.",
    )
  }

  const authContext: RequestAuth = {
    user: {
      id: resolved.user.id,
      name: resolved.user.name,
      email: resolved.user.email,
      emailVerified: resolved.user.emailVerified,
      image: resolved.user.image ?? null,
    },
    session: row,
    device: deviceRow,
    sessionToken: resolved.session.token,
  }
  request.auth = authContext
  return authContext
}

export function requireRecentAuth(authContext: RequestAuth, now: Date): void {
  if (!isRecentAuth(authContext.session.lastAuthAt!, now)) {
    throw new ApiError(
      403,
      "REAUTH_REQUIRED",
      "Confirme sua senha para continuar com esta ação de segurança.",
    )
  }
}

export function clearSessionCookie(reply: FastifyReply): void {
  const secure = config.secureCookies
  reply.setCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  })
}
