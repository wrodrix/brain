import { isAPIError } from "better-auth/api"
import { fromNodeHeaders } from "better-auth/node"
import { and, desc, eq, gt, ne } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { AUTH_LIMITS, type ChangePasswordRequest } from "../../../../shared/auth.js"
import { auth } from "../auth.js"
import { requireRecentAuth, requireSession } from "../guard.js"
import { promoteSessionToTrusted, trustUntilFrom } from "../policy.js"
import { toDeviceView, toSessionSummary, toSessionView } from "../serializers.js"
import { db } from "../../db/client.js"
import { device, session } from "../../db/schema/index.js"
import type { Clock } from "../../clock.js"
import { config } from "../../config.js"
import { ApiError, bodyOf } from "../../http/errors.js"
import { expiredDeviceCookie, expiredSessionCookie } from "../../http/cookies.js"
import { assertTrustedOrigin } from "../../http/origin.js"

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(AUTH_LIMITS.passwordMaxLength),
  newPassword: z
    .string()
    .min(AUTH_LIMITS.passwordMinLength)
    .max(AUTH_LIMITS.passwordMaxLength),
})

export function registerSessionRoutes(app: FastifyInstance, clock: Clock): void {
  app.get("/api/sessions", async (request, reply) => {
    const now = clock.now()
    const authContext = await requireSession(request, reply, now)
    const rows = await db
      .select({ session, device })
      .from(session)
      .leftJoin(device, eq(device.id, session.deviceId))
      .where(
        and(
          eq(session.userId, authContext.user.id),
          gt(session.expiresAt, now),
          gt(session.absoluteExpiresAt, now),
        ),
      )
      .orderBy(desc(session.lastActivityAt))

    const summaries = rows.flatMap(({ session: sessionRow, device: deviceRow }) => {
      if (!sessionRow.absoluteExpiresAt || !sessionRow.lastActivityAt) return []
      return [toSessionSummary(sessionRow, deviceRow, authContext.session.id)]
    })
    return reply.send({ sessions: summaries })
  })

  app.post("/api/sessions/:id/revoke", async (request, reply) => {
    assertTrustedOrigin(request)
    const now = clock.now()
    const authContext = await requireSession(request, reply, now)
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params)
    if (!params.success) throw new ApiError(400, "VALIDATION_ERROR", "Sessão inválida.")

    if (params.data.id === authContext.session.id) {
      await db.transaction(async (tx) => {
        await tx
          .update(device)
          .set({ revokedAt: now, trustedUntil: null })
          .where(eq(device.id, authContext.device.id))
        await tx.delete(session).where(eq(session.deviceId, authContext.device.id))
      })
      reply.header("set-cookie", [
        expiredSessionCookie(config.secureCookies),
        expiredDeviceCookie(config.secureCookies),
      ])
      return reply.status(204).send()
    }

    requireRecentAuth(authContext, now)
    const deleted = await db
      .delete(session)
      .where(and(eq(session.id, params.data.id), eq(session.userId, authContext.user.id)))
      .returning({ id: session.id })
    if (deleted.length === 0) {
      throw new ApiError(404, "NOT_FOUND", "Sessão não encontrada.")
    }
    return reply.status(204).send()
  })

  app.post("/api/devices/current/trust", async (request, reply) => {
    assertTrustedOrigin(request)
    const now = clock.now()
    const authContext = await requireSession(request, reply, now)
    requireRecentAuth(authContext, now)

    await db.transaction(async (tx) => {
      await tx
        .update(device)
        .set({
          trustedUntil: trustUntilFrom(now),
          revokedAt: null,
          lastSeenAt: now,
        })
        .where(eq(device.id, authContext.device.id))

      const active = await tx
        .select()
        .from(session)
        .where(
          and(
            eq(session.deviceId, authContext.device.id),
            gt(session.expiresAt, now),
            gt(session.absoluteExpiresAt, now),
          ),
        )
      for (const row of active) {
        const deadlines = promoteSessionToTrusted(now, row.createdAt)
        await tx
          .update(session)
          .set({
            trusted: true,
            expiresAt: deadlines.expiresAt,
            absoluteExpiresAt: deadlines.absoluteExpiresAt,
            lastActivityAt: now,
            updatedAt: now,
          })
          .where(eq(session.id, row.id))
      }
    })

    const [updated] = await db
      .select()
      .from(session)
      .where(eq(session.id, authContext.session.id))
      .limit(1)
    if (!updated) throw new ApiError(401, "SESSION_EXPIRED", "Sua sessão expirou.")
    const [updatedDevice] = await db
      .select()
      .from(device)
      .where(eq(device.id, authContext.device.id))
      .limit(1)
    if (!updatedDevice) throw new ApiError(401, "SESSION_REVOKED", "Dispositivo revogado.")

    return reply.send({
      session: toSessionView(updated),
      device: toDeviceView(updatedDevice),
    })
  })

  app.delete("/api/devices/current/trust", async (request, reply) => {
    assertTrustedOrigin(request)
    const now = clock.now()
    const authContext = await requireSession(request, reply, now)
    requireRecentAuth(authContext, now)

    await db.transaction(async (tx) => {
      await tx
        .update(device)
        .set({ revokedAt: now, trustedUntil: null })
        .where(eq(device.id, authContext.device.id))
      await tx.delete(session).where(eq(session.deviceId, authContext.device.id))
    })

    reply.header("set-cookie", [
      expiredSessionCookie(config.secureCookies),
      expiredDeviceCookie(config.secureCookies),
    ])
    return reply.status(204).send()
  })

  app.post(
    "/api/account/password",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      assertTrustedOrigin(request)
      const parsed = passwordSchema.safeParse(bodyOf(request))
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          `A nova senha precisa ter pelo menos ${AUTH_LIMITS.passwordMinLength} caracteres.`,
        )
      }
      const body: ChangePasswordRequest = parsed.data
      const now = clock.now()
      const authContext = await requireSession(request, reply, now)
      requireRecentAuth(authContext, now)

      // Verifica a senha antes de revogar qualquer sessão: uma tentativa com
      // senha errada não pode deslogar os outros dispositivos.
      try {
        await auth.api.verifyPassword({
          body: { password: body.currentPassword },
          headers: fromNodeHeaders(request.headers),
        })
      } catch (error) {
        if (isAPIError(error)) {
          throw new ApiError(400, "INVALID_CREDENTIALS", "Senha atual incorreta.")
        }
        throw error
      }

      // Revoga antes da troca: se a troca falhar, o pior estado é "outras
      // sessões encerradas", nunca "senha trocada com sessões antigas vivas".
      await db.transaction(async (tx) => {
        await tx
          .delete(session)
          .where(and(eq(session.userId, authContext.user.id), ne(session.id, authContext.session.id)))
        await tx
          .update(device)
          .set({ revokedAt: now, trustedUntil: null })
          .where(and(eq(device.userId, authContext.user.id), ne(device.id, authContext.device.id)))
      })

      try {
        await auth.api.changePassword({
          body: {
            currentPassword: body.currentPassword,
            newPassword: body.newPassword,
            revokeOtherSessions: false,
          },
          headers: fromNodeHeaders(request.headers),
        })
      } catch (error) {
        if (isAPIError(error)) {
          throw new ApiError(400, "INVALID_CREDENTIALS", "Senha atual incorreta.")
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
}
