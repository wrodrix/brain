import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"
import type { FastifyInstance } from "fastify"

import { buildApp } from "../src/app.js"
import { ShiftedClock } from "../src/clock.js"
import { authHeaders, bootstrapUser, login, prepareDatabase, resetDatabase, stopDatabase, ORIGIN } from "./helpers.js"

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

describe("fundação de autenticação", () => {
  test("setup pendente, bootstrap único e signup público fechado", async () => {
    const status = await app.inject({ method: "GET", url: "/api/setup/status" })
    expect(status.json()).toEqual({ required: true })

    const created = await bootstrapUser(app)
    expect(created.statusCode).toBe(201)
    expect(created.json().user.email).toBe("teste@example.test")

    const after = await app.inject({ method: "GET", url: "/api/setup/status" })
    expect(after.json()).toEqual({ required: false })

    const second = await app.inject({
      method: "POST",
      url: "/api/setup/bootstrap",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      payload: {
        token: "token-que-nao-vale-mais",
        name: "Outro",
        email: "outro@example.test",
        password: "senha-de-teste",
      },
    })
    expect(second.statusCode).toBe(409)
    expect(second.json().error.code).toBe("SETUP_COMPLETE")

    for (const path of [
      "/api/auth/sign-up/email",
      "/api/auth/request-password-reset",
      "/api/auth/reset-password",
      "/api/auth/update-session",
    ]) {
      const response = await app.inject({
        method: "POST",
        url: path,
        headers: { origin: ORIGIN, "content-type": "application/json" },
        payload: { name: "X", email: "x@example.test", password: "senha-de-teste" },
      })
      expect(response.statusCode, path).toBe(404)
    }
  })

  test("login correto, sessão, logout e rejeição do cookie antigo", async () => {
    await bootstrapUser(app)

    const wrong = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      payload: { email: "teste@example.test", password: "senha-errada" },
    })
    expect(wrong.statusCode).toBe(401)
    expect(wrong.json().error.code).toBe("INVALID_CREDENTIALS")

    const success = await login(app, "teste@example.test", "senha-de-teste")
    expect(success.response.statusCode).toBe(200)
    expect(success.cookie).toContain("brain.session_token=")
    expect(success.cookie).toContain("brain_device=")

    const session = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { cookie: success.cookie },
    })
    expect(session.statusCode).toBe(200)
    expect(session.json().user.email).toBe("teste@example.test")
    expect(session.json().session.trusted).toBe(false)

    const sessions = await app.inject({
      method: "GET",
      url: "/api/sessions",
      headers: { cookie: success.cookie },
    })
    expect(sessions.statusCode).toBe(200)
    expect(sessions.json().sessions).toHaveLength(1)
    expect(sessions.json().sessions[0].current).toBe(true)

    const logout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: authHeaders(success.cookie),
    })
    expect(logout.statusCode).toBe(204)

    const oldCookie = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { cookie: success.cookie },
    })
    expect(oldCookie.statusCode).toBe(401)
  })

  test("origem não confiável é rejeitada antes de autenticar", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      payload: { email: "teste@example.test", password: "senha-de-teste" },
    })
    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe("FORBIDDEN_ORIGIN")
  })

  test("sessão de outro navegador exige o cookie de dispositivo", async () => {
    await bootstrapUser(app)
    const success = await login(app, "teste@example.test", "senha-de-teste")
    const withoutDevice = success.cookie
      .split("; ")
      .filter((item) => !item.startsWith("brain_device="))
      .join("; ")

    const response = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { cookie: withoutDevice },
    })
    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe("DEVICE_MISMATCH")
  })
})
