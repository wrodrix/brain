import type { FastifyInstance, LightMyRequestResponse } from "fastify"

import { ensureSetupRow, issueSetupToken } from "../src/auth/routes/setup.js"
import { closeDb, pool } from "../src/db/client.js"
import { runMigrations } from "../src/db/migrate.js"

export const ORIGIN = "http://127.0.0.1:5173"

export async function prepareDatabase(): Promise<void> {
  await runMigrations()
}

export async function resetDatabase(): Promise<void> {
  await pool.query(
    'TRUNCATE TABLE "user", device, session, account, verification, "rateLimit", login_throttle, instance_setup RESTART IDENTITY CASCADE',
  )
  await ensureSetupRow()
}

export async function stopDatabase(): Promise<void> {
  await closeDb()
}

export async function createSetupToken(): Promise<string> {
  const { token } = await issueSetupToken()
  return token
}

export async function bootstrapUser(
  app: FastifyInstance,
  options: { email?: string; password?: string; name?: string } = {},
): Promise<LightMyRequestResponse> {
  const token = await createSetupToken()
  return app.inject({
    method: "POST",
    url: "/api/setup/bootstrap",
    headers: { origin: ORIGIN, "content-type": "application/json" },
    payload: {
      token,
      name: options.name ?? "Pessoa de Teste",
      email: options.email ?? "teste@example.test",
      password: options.password ?? "senha-de-teste",
    },
  })
}

export function cookiesFrom(response: LightMyRequestResponse): string {
  const header = response.headers["set-cookie"]
  const entries = Array.isArray(header) ? header : header ? [header] : []
  return entries
    .map((entry) => entry.split(";")[0])
    .filter((entry) => entry.startsWith("brain"))
    .join("; ")
}

export async function login(
  app: FastifyInstance,
  email: string,
  password: string,
): Promise<{ cookie: string; response: LightMyRequestResponse; body: unknown }> {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    headers: { origin: ORIGIN, "content-type": "application/json" },
    payload: { email, password },
  })
  return {
    cookie: cookiesFrom(response),
    response,
    body: response.json(),
  }
}

export function authHeaders(cookie: string, extra: Record<string, string> = {}) {
  return {
    cookie,
    origin: ORIGIN,
    "content-type": "application/json",
    ...extra,
  }
}
