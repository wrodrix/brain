import { afterAll, beforeAll, describe, expect, test } from "vitest"
import type { FastifyInstance } from "fastify"

import { buildApp } from "../src/app.js"
import { ShiftedClock } from "../src/clock.js"
import { pool } from "../src/db/client.js"
import { bootstrapUser, login, prepareDatabase, resetDatabase } from "./helpers.js"

let app: FastifyInstance
const clock = new ShiftedClock()

beforeAll(async () => {
  await prepareDatabase()
  app = await buildApp({ clock, logger: false, serveStatic: false, rateLimit: false })
})

afterAll(async () => {
  await app.close()
})

describe("banco indisponível", () => {
  test("health e sessão válida falham fechado com 503", async () => {
    await resetDatabase()
    await bootstrapUser(app)
    const { cookie } = await login(app, "teste@example.test", "senha-de-teste")

    await pool.end()

    const health = await app.inject({ method: "GET", url: "/api/health" })
    expect(health.statusCode).toBe(503)
    expect(health.json().db).toBe("down")

    const session = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { cookie },
    })
    expect(session.statusCode).toBe(503)
    expect(session.json().error.code).toBe("DB_UNAVAILABLE")
  })
})
