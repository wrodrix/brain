import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"

import type { AuthErrorCode } from "../../../shared/auth.js"

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function sendApiError(
  reply: FastifyReply,
  error: unknown,
  requestId: string,
): FastifyReply {
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message, requestId },
    })
  }

  const maybePg = error as { code?: string }
  if (
    maybePg.code === "ECONNREFUSED" ||
    maybePg.code === "ECONNRESET" ||
    maybePg.code === "ETIMEDOUT" ||
    (typeof maybePg.code === "string" &&
      (maybePg.code.startsWith("08") ||
        maybePg.code.startsWith("57P") ||
        maybePg.code === "53300"))
  ) {
    return reply.status(503).send({
      error: {
        code: "DB_UNAVAILABLE",
        message: "Banco indisponível. Tente novamente em instantes.",
        requestId,
      },
    })
  }

  return reply.status(500).send({
    error: {
      code: "INTERNAL",
      message: "Não foi possível concluir a operação.",
      requestId,
    },
  })
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const statusCode = (error as { statusCode?: number }).statusCode
    if ((error as { validation?: unknown }).validation || statusCode === 400) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos.",
          requestId: request.id,
        },
      })
    }
    if (statusCode === 413) {
      return reply.status(413).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Requisição grande demais.",
          requestId: request.id,
        },
      })
    }
    if (!(error instanceof ApiError) || error.statusCode >= 500) {
      request.log.error({ err: error, requestId: request.id }, "request failed")
    }
    return sendApiError(reply, error, request.id)
  })
}

export function bodyOf(request: FastifyRequest): Record<string, unknown> {
  if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Corpo JSON obrigatório.")
  }
  return request.body as Record<string, unknown>
}
