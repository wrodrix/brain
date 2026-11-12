import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"
import type { FastifyInstance } from "fastify"

import { auth } from "../src/auth/auth.js"
import { buildApp } from "../src/app.js"
import { ShiftedClock } from "../src/clock.js"
import { pool } from "../src/db/client.js"
import {
  bootstrapUser,
  createSetupToken,
  login,
  prepareDatabase,
  resetDatabase,
  stopDatabase,
  ORIGIN,
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
})

afterAll(async () => {
  await app.close()
  await stopDatabase()
})

describe("bootstrap concorrente e retomada", () => {
  test("duas ou mais tentativas de primeiro cadastro produzem um único usuário", async () => {
    const token = await createSetupToken()
    const payload = {
      token,
      name: "Concorrente",
      email: "corrida@example.test",
      password: "senha-de-teste",
    }
    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        app.inject({
          method: "POST",
          url: "/api/setup/bootstrap",
          headers: { origin: ORIGIN, "content-type": "application/json" },
          payload,
        }),
      ),
    )
    const created = responses.filter((response) => response.statusCode === 201)
    const conflict = responses.filter((response) => response.statusCode === 409)
    expect(created).toHaveLength(1)
    expect(conflict).toHaveLength(19)

    const users = await pool.query<{ count: number }>('select count(*)::int as count from "user"')
    expect(users.rows[0]?.count).toBe(1)
  })

  test("sessão sobrevive a uma nova instância da API e get-session não renova prazo", async () => {
    await bootstrapUser(app)
    const { cookie, body } = await login(app, "teste@example.test", "senha-de-teste")
    const sessionId = (body as { session: { id: string } }).session.id
    const before = await pool.query<{ expires_at: Date }>(
      "select expires_at from session where id = $1",
      [sessionId],
    )

    await auth.api.getSession({ headers: new Headers({ cookie }) })

    const after = await pool.query<{ expires_at: Date }>(
      "select expires_at from session where id = $1",
      [sessionId],
    )
    expect(after.rows[0]?.expires_at.toISOString()).toBe(before.rows[0]?.expires_at.toISOString())

    const restarted = await buildApp({ clock, logger: false, serveStatic: false, rateLimit: false })
    const response = await restarted.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { cookie },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().user.email).toBe("teste@example.test")
    await restarted.close()
  })
})
