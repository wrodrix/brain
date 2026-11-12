import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"
import type { FastifyInstance } from "fastify"

import { buildApp } from "../src/app.js"
import { ShiftedClock } from "../src/clock.js"
import {
  authHeaders,
  bootstrapUser,
  login,
  prepareDatabase,
  resetDatabase,
  stopDatabase,
} from "./helpers.js"

let app: FastifyInstance
const clock = new ShiftedClock()

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

beforeAll(async () => {
  await prepareDatabase()
  app = await buildApp({ clock, logger: false, serveStatic: false, rateLimit: false })
})

beforeEach(async () => {
  clock.reset()
  await resetDatabase()
  await bootstrapUser(app)
})

afterAll(async () => {
  await app.close()
  await stopDatabase()
})

async function currentSession(cookie: string) {
  const response = await app.inject({
    method: "GET",
    url: "/api/auth/session",
    headers: { cookie },
  })
  return response
}

describe("política de sessão", () => {
  test("não confiável: 15 minutos de inatividade e 1 hora absoluta", async () => {
    const { cookie, body } = await login(app, "teste@example.test", "senha-de-teste")
    const snapshot = body as {
      session: {
        createdAt: string
        lastActivityAt: string
        expiresAt: string
        absoluteExpiresAt: string
      }
    }
    const created = new Date(snapshot.session.createdAt).getTime()
    const activity = new Date(snapshot.session.lastActivityAt).getTime()
    expect(new Date(snapshot.session.expiresAt).getTime() - activity).toBe(15 * MINUTE)
    expect(new Date(snapshot.session.absoluteExpiresAt).getTime() - created).toBeGreaterThanOrEqual(
      60 * MINUTE - 2_000,
    )

    clock.advance(16 * MINUTE)
    const expired = await currentSession(cookie)
    expect(expired.statusCode).toBe(401)
    expect(expired.json().error.code).toBe("SESSION_EXPIRED")
  })

  test("consulta de sessão não renova inatividade", async () => {
    const { cookie, body } = await login(app, "teste@example.test", "senha-de-teste")
    const before = (body as { session: { expiresAt: string } }).session.expiresAt
    clock.advance(5 * MINUTE)
    const check = await currentSession(cookie)
    expect(check.statusCode).toBe(200)
    expect(check.json().session.expiresAt).toBe(before)
  })

  test("atividade explícita estende até o teto absoluto, nunca além", async () => {
    const { cookie, body } = await login(app, "teste@example.test", "senha-de-teste")
    const absolute = (body as { session: { absoluteExpiresAt: string } }).session.absoluteExpiresAt

    let capped:
      | Awaited<ReturnType<typeof app.inject>>
      | undefined
    for (let index = 0; index < 5; index += 1) {
      clock.advance(10 * MINUTE)
      capped = await app.inject({
        method: "POST",
        url: "/api/auth/activity",
        headers: authHeaders(cookie),
      })
      expect(capped.statusCode).toBe(200)
    }
    expect(capped!.json().absoluteExpiresAt).toBe(absolute)
    expect(capped!.json().expiresAt).toBe(absolute)

    clock.advance(11 * MINUTE)
    const expired = await currentSession(cookie)
    expect(expired.statusCode).toBe(401)
  })

  test("confiança promove para 30 dias/90 dias e revogação encerra", async () => {
    const { cookie, body } = await login(app, "teste@example.test", "senha-de-teste")
    const created = new Date((body as { session: { createdAt: string } }).session.createdAt).getTime()

    const trust = await app.inject({
      method: "POST",
      url: "/api/devices/current/trust",
      headers: authHeaders(cookie),
    })
    expect(trust.statusCode).toBe(200)
    const trusted = trust.json().session
    expect(trusted.trusted).toBe(true)
    expect(new Date(trusted.expiresAt).getTime() - created).toBeGreaterThanOrEqual(30 * DAY - 1_000)
    expect(new Date(trusted.absoluteExpiresAt).getTime() - created).toBe(90 * DAY)

    const revoked = await app.inject({
      method: "DELETE",
      url: "/api/devices/current/trust",
      headers: authHeaders(cookie),
    })
    expect(revoked.statusCode).toBe(204)
    const after = await currentSession(cookie)
    expect(after.statusCode).toBe(401)
  })

  test("teto absoluto de 90 dias vence mesmo com atividade", async () => {
    const { cookie } = await login(app, "teste@example.test", "senha-de-teste")
    await app.inject({
      method: "POST",
      url: "/api/devices/current/trust",
      headers: authHeaders(cookie),
    })

    for (let index = 0; index < 3; index += 1) {
      clock.advance(29 * DAY)
      const activity = await app.inject({
        method: "POST",
        url: "/api/auth/activity",
        headers: authHeaders(cookie),
      })
      expect(activity.statusCode).toBe(200)
    }

    clock.advance(4 * DAY)
    const expired = await currentSession(cookie)
    expect(expired.statusCode).toBe(401)
    expect(expired.json().error.code).toBe("SESSION_EXPIRED")
  })
})
