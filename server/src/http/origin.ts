import type { FastifyRequest } from "fastify"

import { config } from "../config.js"
import { ApiError } from "./errors.js"

/**
 * Rotas próprias chamam auth.api diretamente, e o Better Auth documenta que
 * esse caminho não aplica as checagens de CSRF/origem do handler. Esta é a
 * barreira explícita para toda mutação.
 */
export function assertTrustedOrigin(request: FastifyRequest): void {
  const origin = request.headers.origin
  if (!origin || !config.trustedOrigins.includes(origin)) {
    throw new ApiError(403, "FORBIDDEN_ORIGIN", "Origem não autorizada.")
  }

  const site = request.headers["sec-fetch-site"]
  if (site && site !== "same-origin" && site !== "none") {
    throw new ApiError(403, "FORBIDDEN_ORIGIN", "Origem não autorizada.")
  }

  const hasBody =
    Number(request.headers["content-length"] ?? 0) > 0 ||
    request.headers["transfer-encoding"] !== undefined
  const contentType = request.headers["content-type"]
  if (
    hasBody &&
    (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") &&
    (!contentType || !contentType.toLowerCase().startsWith("application/json"))
  ) {
    throw new ApiError(400, "VALIDATION_ERROR", "Content-Type application/json obrigatório.")
  }
}
