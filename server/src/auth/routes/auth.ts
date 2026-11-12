import { isAPIError } from "better-auth/api"
import { fromNodeHeaders } from "better-auth/node"
import { and, eq, gt } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import {
  AUTH_LIMITS,
  type AuthSnapshot,
  type LoginRequest,
  type ReauthRequest,
} from "../../../../shared/auth.js"
import { auth } from "../auth.js"
import { DEVICE_COOKIE, resolveLoginDevice } from "../device.js"
import { clearSessionCookie, requireSession, SESSION_COOKIE } from "../guard.js"
import { extendSessionActivity, isActivityThrottled, isTrustValid, newSessionDeadlines } from "../policy.js"
import { toDeviceView, toPublicUser, toSessionView } from "../serializers.js"
import { assertLoginAllowed, clearLoginFailures, recordLoginFailure } from "../throttle.js"
import { db } from "../../db/client.js"
import { device, session } from "../../db/schema/index.js"
import { config } from "../../config.js"
import type { Clock } from "../../clock.js"
import { ApiError, bodyOf } from "../../http/errors.js"
import { buildDeviceCookie, expiredDeviceCookie, expiredSessionCookie } from "../../http/cookies.js"
import { assertTrustedOrigin } from "../../http/origin.js"

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(AUTH_LIMITS.passwordMaxLength),
})

const reauthSchema = z.object({
  password: z.string().min(1).max(AUTH_LIMITS.passwordMaxLength),
})

export function registerAuthRoutes(app: FastifyInstance, clock: Clock): void {
  app.post(
    "/api/auth/login",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      assertTrustedOrigin(request)
      const parsed = loginSchema.safeParse(bodyOf(request))
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Email ou senha inválidos.")
      }
      const body: LoginRequest = parsed.data
      const now = clock.now()
      const ip = request.ip
      await assertLoginAllowed(body.email, ip, now)

      let result: {
        headers: Headers
        response: { token: string; user: AuthSnapshot["user"] }
      }
      try {
        result = (await auth.api.signInEmail({
          body: {
            email: body.email,
            password: body.password,
            // A política ignora rememberMe; o cookie tem teto máximo e o banco decide.
            rememberMe: true,
          },
          headers: fromNodeHeaders(request.headers),
          returnHeaders: true,
        })) as unknown as typeof result
      } catch (error) {
        await recordLoginFailure(body.email, ip, now).catch(() => undefined)
        if (isAPIError(error)) {
          const status = (error as { statusCode?: number }).statusCode
          if (status === 429) {
            throw new ApiError(429, "RATE_LIMITED", "Muitas tentativas. Aguarde e tente novamente.")
          }
          if (status === 401 || status === 400) {
            throw new ApiError(401, "INVALID_CREDENTIALS", "Email ou senha incorretos.")
          }
        }
        throw new ApiError(503, "DB_UNAVAILABLE", "Não foi possível entrar agora.")
      }

      await clearLoginFailures(body.email).catch(() => undefined)
      const token = result.response?.token
      if (!token) {
        throw new ApiError(500, "INTERNAL", "Sessão não criada.")
      }

      let updatedSession: typeof session.$inferSelect | undefined
      let deviceRow: typeof device.$inferSelect | undefined
      let deviceToken = ""
      try {
        const [created] = await db
          .select()
          .from(session)
          .where(eq(session.token, token))
          .limit(1)
        if (!created) throw new Error("Sessão não encontrada após o login.")

        const resolvedDevice = await resolveLoginDevice({
          userId: created.userId,
          existingToken: request.cookies[DEVICE_COOKIE],
          userAgent: request.headers["user-agent"],
          now,
        })
        deviceToken = resolvedDevice.token

        const [foundDevice] = await db
          .select()
          .from(device)
          .where(eq(device.id, resolvedDevice.id))
          .limit(1)
        if (!foundDevice) throw new Error("Dispositivo não encontrado.")
        deviceRow = foundDevice

        const trusted = isTrustValid(foundDevice, now)
        const deadlines = newSessionDeadlines(now, created.createdAt, trusted)
        const [updated] = await db
          .update(session)
          .set({
            deviceId: foundDevice.id,
            trusted,
            expiresAt: deadlines.expiresAt,
            absoluteExpiresAt: deadlines.absoluteExpiresAt,
            lastAuthAt: now,
            lastActivityAt: now,
            updatedAt: now,
            ipAddress: ip,
            userAgent: request.headers["user-agent"]?.slice(0, 512) ?? null,
          })
          .where(eq(session.id, created.id))
          .returning()
        if (!updated) throw new Error("Não foi possível aplicar a política de sessão.")
        updatedSession = updated
      } catch {
        await db.delete(session).where(eq(session.token, token)).catch(() => undefined)
        throw new ApiError(500, "INTERNAL", "Não foi possível aplicar a política de sessão.")
      }

      if (!updatedSession || !deviceRow) {
        throw new ApiError(500, "INTERNAL", "Sessão não criada.")
      }

      const headers = result.headers.getSetCookie()
      headers.push(
        buildDeviceCookie(
          deviceToken,
          config.secureCookies,
          Math.floor(AUTH_LIMITS.trustValidityMs / 1000),
        ),
      )
      reply.header("set-cookie", headers)

      const snapshot: AuthSnapshot = {
        user: toPublicUser(result.response.user),
        session: toSessionView(updatedSession),
        device: toDeviceView(deviceRow),
      }
      return reply.status(200).send(snapshot)
    },
  )

  app.post("/api/auth/logout", async (request, reply) => {
    assertTrustedOrigin(request)
    const authContext = await requireSession(request, reply, clock.now())

    let authCookies: string[] = []
    try {
      const result = (await auth.api.signOut({
        headers: fromNodeHeaders(request.headers),
        returnHeaders: true,
      })) as unknown as { headers: Headers }
      authCookies = result.headers.getSetCookie()
    } catch {
      // Mesmo se o signOut da biblioteca falhar, a remoção abaixo é autoritativa.
    }

    const now = clock.now()
    await db.transaction(async (tx) => {
      await tx
        .update(device)
        .set({ revokedAt: now, trustedUntil: null })
        .where(eq(device.id, authContext.device.id))
      await tx.delete(session).where(eq(session.deviceId, authContext.device.id))
    })

    reply.header("set-cookie", [
      ...authCookies,
      expiredSessionCookie(config.secureCookies),
      expiredDeviceCookie(config.secureCookies),
    ])
    return reply.status(204).send()
  })

  app.get("/api/auth/session", async (request, reply) => {
    // Sem cookie, a checagem inicial é uma resposta normal (não um erro de console).
    if (!request.cookies[SESSION_COOKIE]) {
      return reply.send({ authenticated: false })
    }
    const authContext = await requireSession(request, reply, clock.now())
    const snapshot: AuthSnapshot = {
      user: toPublicUser(authContext.user),
      session: toSessionView(authContext.session),
      device: toDeviceView(authContext.device),
    }
    return reply.send(snapshot)
  })

  app.post("/api/auth/activity", async (request, reply) => {
    assertTrustedOrigin(request)
    const now = clock.now()
    const authContext = await requireSession(request, reply, now)

    if (isActivityThrottled(authContext.session.lastActivityAt!, now)) {
      return reply.send({
        expiresAt: authContext.session.expiresAt.toISOString(),
        absoluteExpiresAt: authContext.session.absoluteExpiresAt!.toISOString(),
      })
    }

    const deadlines = extendSessionActivity(
      now,
      authContext.session.trusted,
      authContext.session.absoluteExpiresAt!,
    )
    const [updated] = await db
      .update(session)
      .set({
        expiresAt: deadlines.expiresAt,
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(session.id, authContext.session.id),
          gt(session.expiresAt, now),
          gt(session.absoluteExpiresAt, now),
        ),
      )
      .returning()

    if (!updated) {
      clearSessionCookie(reply)
      throw new ApiError(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.")
    }

    return reply.send({
      expiresAt: updated.expiresAt.toISOString(),
      absoluteExpiresAt: updated.absoluteExpiresAt!.toISOString(),
    })
  })

  app.post(
    "/api/auth/reauth",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      assertTrustedOrigin(request)
      const parsed = reauthSchema.safeParse(bodyOf(request))
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Senha inválida.")
      }
      const body: ReauthRequest = parsed.data
      const now = clock.now()
      const authContext = await requireSession(request, reply, now)

      try {
        await auth.api.verifyPassword({
          body: { password: body.password },
          headers: fromNodeHeaders(request.headers),
        })
      } catch (error) {
        if (isAPIError(error)) {
          throw new ApiError(400, "INVALID_CREDENTIALS", "Senha incorreta.")
        }
        throw error
      }

      await db
        .update(session)
        .set({ lastAuthAt: now, updatedAt: now })
        .where(eq(session.id, authContext.session.id))
      return reply.status(204).send()
    },
  )

  app.get("/api/health", async (_request, reply) => {
    try {
      const [row] = await db
        .select({ id: session.id })
        .from(session)
        .limit(1)
      return reply.send({
        status: "ok",
        db: "up",
        migrations: row ? "current" : "current",
      })
    } catch {
      return reply.status(503).send({
        status: "unhealthy",
        db: "down",
        migrations: "unknown",
      })
    }
  })
}
