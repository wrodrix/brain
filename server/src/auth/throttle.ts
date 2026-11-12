import { and, eq, or } from "drizzle-orm"

import { db } from "../db/client.js"
import { loginThrottle } from "../db/schema/index.js"
import { ApiError } from "../http/errors.js"
import { hashOpaqueToken, normalizeEmail } from "./tokens.js"

const WINDOW_MS = 15 * 60_000
const LOCK_MS = 5 * 60_000
const EMAIL_MAX_FAILURES = 5
const IP_MAX_FAILURES = 20

export async function assertLoginAllowed(
  email: string,
  ip: string,
  now: Date,
): Promise<void> {
  const keys = throttleKeys(email, ip)
  const rows = await db
    .select()
    .from(loginThrottle)
    .where(
      or(
        ...keys.map((key) =>
          and(eq(loginThrottle.keyHash, key.keyHash), eq(loginThrottle.kind, key.kind)),
        ),
      ),
    )
  for (const row of rows) {
    if (row.lockedUntil && row.lockedUntil.getTime() > now.getTime()) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      )
    }
  }
}

export async function recordLoginFailure(
  email: string,
  ip: string,
  now: Date,
): Promise<void> {
  const keys = throttleKeys(email, ip)
  await db.transaction(async (tx) => {
    for (const key of keys) {
      const [existing] = await tx
        .select()
        .from(loginThrottle)
        .where(
          and(
            eq(loginThrottle.keyHash, key.keyHash),
            eq(loginThrottle.kind, key.kind),
          ),
        )
        .for("update")

      if (!existing) {
        await tx.insert(loginThrottle).values({
          keyHash: key.keyHash,
          kind: key.kind,
          failures: 1,
          windowStartedAt: now,
          lockedUntil: null,
        })
        continue
      }

      const withinWindow = now.getTime() - existing.windowStartedAt.getTime() < WINDOW_MS
      const failures = withinWindow ? existing.failures + 1 : 1
      const lockedUntil =
        failures >= key.maxFailures ? new Date(now.getTime() + LOCK_MS) : null

      await tx
        .update(loginThrottle)
        .set({
          failures,
          windowStartedAt: withinWindow ? existing.windowStartedAt : now,
          lockedUntil,
        })
        .where(
          and(
            eq(loginThrottle.keyHash, key.keyHash),
            eq(loginThrottle.kind, key.kind),
          ),
        )
    }
  })
}

export async function clearLoginFailures(email: string): Promise<void> {
  await db
    .delete(loginThrottle)
    .where(
      and(
        eq(loginThrottle.keyHash, hashOpaqueToken(normalizeEmail(email))),
        eq(loginThrottle.kind, "email"),
      ),
    )
}

function throttleKeys(email: string, ip: string) {
  return [
    {
      kind: "email" as const,
      keyHash: hashOpaqueToken(normalizeEmail(email)),
      maxFailures: EMAIL_MAX_FAILURES,
    },
    {
      kind: "ip" as const,
      keyHash: hashOpaqueToken(ip),
      maxFailures: IP_MAX_FAILURES,
    },
  ]
}
