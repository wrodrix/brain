import { existsSync } from "node:fs"
import { join } from "node:path"

import fastifyCookie from "@fastify/cookie"
import fastifyRateLimit from "@fastify/rate-limit"
import fastifyStatic from "@fastify/static"
import Fastify, { type FastifyInstance } from "fastify"
import { z } from "zod"

import { registerAuthRoutes } from "./auth/routes/auth.js"
import { registerSessionRoutes } from "./auth/routes/sessions.js"
import { registerSetupRoutes } from "./auth/routes/setup.js"
import { config } from "./config.js"
import { ShiftedClock, systemClock, type Clock } from "./clock.js"
import { registerErrorHandler } from "./http/errors.js"

export interface BuildAppOptions {
  clock?: Clock
  logger?: boolean
  serveStatic?: boolean
  rateLimit?: boolean
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const clock = options.clock ?? (config.testMode ? new ShiftedClock() : systemClock)
  const app = Fastify({
    trustProxy: config.trustProxy,
    bodyLimit: 64 * 1024,
    logger:
      options.logger === false
        ? false
        : {
            level: config.nodeEnv === "test" ? "silent" : "info",
            redact: {
              paths: [
                "req.headers.cookie",
                "req.headers.authorization",
                'res.headers["set-cookie"]',
              ],
              censor: "[redacted]",
            },
          },
    genReqId: () => crypto.randomUUID(),
  })

  // POSTs sem corpo (logout, revogação) podem chegar com application/json vazio.
  // O parser transforma corpo vazio em objeto; JSON inválido continua 400.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => {
      const text = typeof body === "string" ? body : body.toString("utf8")
      if (text === "") return done(null, {})
      try {
        done(null, JSON.parse(text))
      } catch {
        done(Object.assign(new Error("JSON inválido"), { statusCode: 400 }), undefined)
      }
    },
  )

  await app.register(fastifyCookie)
  if (options.rateLimit !== false) {
    await app.register(fastifyRateLimit, {
      global: false,
      errorResponseBuilder: (request) => ({
        error: {
          code: "RATE_LIMITED",
          message: "Muitas tentativas. Aguarde e tente novamente.",
          requestId: request.id,
        },
      }),
    })
  }

  app.addHook("onRequest", async (request) => {
    // Sobrescreve qualquer valor enviado pelo cliente. O Better Auth usa este
    // header para rate limit/registro de IP; nunca confiamos no XFF bruto.
    request.headers["x-brain-client-ip"] = request.ip
  })

  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff")
    reply.header("referrer-policy", "no-referrer")
    reply.header("x-frame-options", "DENY")
    reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()")
    if (config.secureCookies) {
      reply.header("strict-transport-security", "max-age=31536000; includeSubDomains")
    }
    if (
      request.url.startsWith("/api/auth") ||
      request.url.startsWith("/api/sessions") ||
      request.url.startsWith("/api/devices") ||
      request.url.startsWith("/api/account") ||
      request.url.startsWith("/api/setup")
    ) {
      reply.header("cache-control", "no-store")
    }
    return payload
  })

  registerErrorHandler(app)
  registerSetupRoutes(app, clock)
  registerAuthRoutes(app, clock)
  registerSessionRoutes(app, clock)

  if (config.testMode && clock instanceof ShiftedClock) {
    app.post("/api/test/reset", async (_request, reply) => {
      clock.reset()
      return reply.send({ now: clock.now().toISOString() })
    })
    app.post("/api/test/advance", async (request, reply) => {
      const parsed = z.object({ ms: z.number().int().positive().max(400 * 24 * 60 * 60_000) }).safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ error: "invalid" })
      clock.advance(parsed.data.ms)
      return reply.send({ now: clock.now().toISOString() })
    })
  }

  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Rota não encontrada.", requestId: request.id },
      })
    }
    if (request.method === "GET" && options.serveStatic !== false && existsSync(join(process.cwd(), "dist", "index.html"))) {
      return reply.sendFile("index.html")
    }
    return reply.status(404).send({
      error: { code: "NOT_FOUND", message: "Rota não encontrada.", requestId: request.id },
    })
  })

  if (options.serveStatic !== false && existsSync(join(process.cwd(), "dist"))) {
    await app.register(fastifyStatic, {
      root: join(process.cwd(), "dist"),
      wildcard: false,
      index: false,
    })
  }

  return app
}
