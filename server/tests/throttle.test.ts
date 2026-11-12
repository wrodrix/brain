import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"
import type { FastifyInstance } from "fastify"

import { buildApp } from "../src/app.js"
import { ShiftedClock } from "../src/clock.js"
import { pool } from "../src/db/client.js"
import {
  bootstrapUser,
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
  await bootstrapUser(app)
})

afterAll(async () => {
  await app.close()
  await stopDatabase()
})

describe("throttle de login", () => {
  test("bloqueia por conta após falhas e libera após sucesso sem lock", async () => {
    for (let index = 0; index < 5; index += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        payload: { email: "teste@example.test", password: "senha-errada" },
      })
      expect(response.statusCode).toBe(401)
    }

    const locked = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      payload: { email: "teste@example.test", password: "senha-de-teste" },
    })
    expect(locked.statusCode).toBe(429)
    expect(locked.json().error.code).toBe("RATE_LIMITED")

    await pool.query("delete from login_throttle")
    const success = await login(app, "teste@example.test", "senha-de-teste")
    expect(success.response.statusCode).toBe(200)

    const rows = await pool.query("select 1 from login_throttle where kind = 'email'")
    expect(rows.rowCount).toBe(0)
  })
})
