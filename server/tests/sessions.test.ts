import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"
import type { FastifyInstance } from "fastify"

import { buildApp } from "../src/app.js"
import { ShiftedClock } from "../src/clock.js"
import { pool } from "../src/db/client.js"
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

async function listSessions(cookie: string) {
  const response = await app.inject({
    method: "GET",
    url: "/api/sessions",
    headers: { cookie },
  })
  return response.json().sessions as Array<{ id: string; current: boolean }>
}

describe("sessões e dispositivos", () => {
  test("lista apenas as próprias sessões e revoga outra sessão", async () => {
    const first = await login(app, "teste@example.test", "senha-de-teste")
    const second = await login(app, "teste@example.test", "senha-de-teste")

    const sessions = await listSessions(first.cookie)
    expect(sessions).toHaveLength(2)
    const other = sessions.find((item) => !item.current)
    expect(other).toBeTruthy()

    const revoked = await app.inject({
      method: "POST",
      url: `/api/sessions/${other!.id}/revoke`,
      headers: authHeaders(first.cookie),
    })
    expect(revoked.statusCode).toBe(204)

    const secondSession = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { cookie: second.cookie },
    })
    expect(secondSession.statusCode).toBe(401)
    expect(await listSessions(first.cookie)).toHaveLength(1)
  })

  test("revogar outra sessão exige autenticação recente", async () => {
    const first = await login(app, "teste@example.test", "senha-de-teste")
    await login(app, "teste@example.test", "senha-de-teste")
    const sessions = await listSessions(first.cookie)
    const other = sessions.find((item) => !item.current)!

    await pool.query(
      `update session set last_auth_at = now() - interval '20 minutes' where id = $1`,
      [(first.body as { session: { id: string } }).session.id],
    )
    const blocked = await app.inject({
      method: "POST",
      url: `/api/sessions/${other.id}/revoke`,
      headers: authHeaders(first.cookie),
    })
    expect(blocked.statusCode).toBe(403)
    expect(blocked.json().error.code).toBe("REAUTH_REQUIRED")

    const reauth = await app.inject({
      method: "POST",
      url: "/api/auth/reauth",
      headers: authHeaders(first.cookie),
      payload: { password: "senha-de-teste" },
    })
    expect(reauth.statusCode).toBe(204)

    const retried = await app.inject({
      method: "POST",
      url: `/api/sessions/${other.id}/revoke`,
      headers: authHeaders(first.cookie),
    })
    expect(retried.statusCode).toBe(204)
  })

  test("troca de senha revoga as outras sessões e mantém a atual", async () => {
    const first = await login(app, "teste@example.test", "senha-de-teste")
    const second = await login(app, "teste@example.test", "senha-de-teste")

    const changed = await app.inject({
      method: "POST",
      url: "/api/account/password",
      headers: authHeaders(first.cookie),
      payload: { currentPassword: "senha-de-teste", newPassword: "outra-senha-123" },
    })
    expect(changed.statusCode).toBe(204)

    const secondSession = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { cookie: second.cookie },
    })
    expect(secondSession.statusCode).toBe(401)

    const oldPassword = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin: "http://127.0.0.1:5173", "content-type": "application/json" },
      payload: { email: "teste@example.test", password: "senha-de-teste" },
    })
    expect(oldPassword.statusCode).toBe(401)

    const newPassword = await login(app, "teste@example.test", "outra-senha-123")
    expect(newPassword.response.statusCode).toBe(200)
  })
})
