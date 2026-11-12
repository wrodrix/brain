import { eq } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { AUTH_LIMITS } from "../../../../shared/auth.js"
import { auth } from "../auth.js"
import { toPublicUser } from "../serializers.js"
import { createOpaqueToken, hashOpaqueToken, newId, normalizeEmail, safeEqual } from "../tokens.js"
import { db } from "../../db/client.js"
import { account, instanceSetup, user } from "../../db/schema/index.js"
import { config } from "../../config.js"
import type { Clock } from "../../clock.js"
import { ApiError, bodyOf } from "../../http/errors.js"
import { assertTrustedOrigin } from "../../http/origin.js"

const setupSchema = z.object({
  token: z.string().min(16).max(256),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  password: z
    .string()
    .min(AUTH_LIMITS.passwordMinLength)
    .max(AUTH_LIMITS.passwordMaxLength),
})

export async function ensureSetupRow(): Promise<void> {
  await db.insert(instanceSetup).values({ id: 1, status: "pending" }).onConflictDoNothing()
}

export function registerSetupRoutes(app: FastifyInstance, clock: Clock): void {
  app.get("/api/setup/status", async (_request, reply) => {
    await ensureSetupRow()
    const [row] = await db
      .select({ status: instanceSetup.status })
      .from(instanceSetup)
      .where(eq(instanceSetup.id, 1))
      .limit(1)
    return reply.send({ required: row?.status !== "completed" })
  })

  app.post(
    "/api/setup/bootstrap",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      assertTrustedOrigin(request)
      const parsed = setupSchema.safeParse(bodyOf(request))
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          `Dados inválidos. A senha precisa ter pelo menos ${AUTH_LIMITS.passwordMinLength} caracteres.`,
        )
      }
      const body = parsed.data
      const email = normalizeEmail(body.email)
      const now = clock.now()

      const context = await auth.$context
      const passwordHash = await context.password.hash(body.password)

      const createdUser = await db.transaction(async (tx) => {
        await tx.insert(instanceSetup).values({ id: 1, status: "pending" }).onConflictDoNothing()
        const [row] = await tx
          .select()
          .from(instanceSetup)
          .where(eq(instanceSetup.id, 1))
          .for("update")
          .limit(1)

        if (!row || row.status === "completed") {
          throw new ApiError(409, "SETUP_COMPLETE", "O primeiro usuário já foi criado.")
        }
        if (
          !row.tokenHash ||
          !row.tokenExpiresAt ||
          row.tokenExpiresAt.getTime() <= now.getTime()
        ) {
          throw new ApiError(
            403,
            "INVALID_SETUP_TOKEN",
            "Token de instalação ausente ou expirado. Gere um novo.",
          )
        }
        if (!safeEqual(hashOpaqueToken(body.token), row.tokenHash)) {
          throw new ApiError(403, "INVALID_SETUP_TOKEN", "Token de instalação inválido.")
        }

        const [existing] = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, email))
          .limit(1)
        if (existing) {
          throw new ApiError(409, "SETUP_COMPLETE", "Já existe um usuário com este email.")
        }

        const userId = newId()
        const [created] = await tx
          .insert(user)
          .values({
            id: userId,
            name: body.name,
            email,
            emailVerified: false,
            image: null,
            createdAt: now,
            updatedAt: now,
          })
          .returning()
        if (!created) throw new ApiError(500, "INTERNAL", "Não foi possível criar o usuário.")

        await tx.insert(account).values({
          id: newId(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        })

        await tx
          .update(instanceSetup)
          .set({
            status: "completed",
            tokenHash: null,
            tokenExpiresAt: null,
            completedAt: now,
            completedUserId: userId,
          })
          .where(eq(instanceSetup.id, 1))

        return created
      })

      return reply.status(201).send({ user: toPublicUser(createdUser) })
    },
  )
}

export async function issueSetupToken(): Promise<{ token: string; expiresAt: Date }> {
  await ensureSetupRow()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + config.setupTokenTtlHours * 60 * 60_000)
  const token = createOpaqueToken()
  const [row] = await db
    .update(instanceSetup)
    .set({
      tokenHash: hashOpaqueToken(token),
      tokenCreatedAt: now,
      tokenExpiresAt: expiresAt,
    })
    .where(eq(instanceSetup.status, "pending"))
    .returning({ id: instanceSetup.id })
  if (!row) {
    throw new Error("Setup já concluído; não é possível gerar novo token.")
  }
  return { token, expiresAt }
}
