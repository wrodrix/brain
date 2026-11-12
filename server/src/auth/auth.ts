import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"

import { AUTH_LIMITS } from "../../../shared/auth.js"
import { config } from "../config.js"
import { db } from "../db/client.js"
import { authSchema } from "../db/schema/index.js"

export const auth = betterAuth({
  appName: "Brain",
  baseURL: config.authUrl,
  secret: config.authSecret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  trustedOrigins: config.trustedOrigins,
  // Defesa em profundidade: mesmo que um handler catch-all seja montado no
  // futuro, estes caminhos não respondem. O lote atual não monta nenhum deles.
  disabledPaths: [
    "/sign-up/email",
    "/request-password-reset",
    "/reset-password",
    "/change-email",
    "/change-password",
    "/delete-user",
    "/list-sessions",
    "/revoke-session",
    "/revoke-sessions",
    "/revoke-other-sessions",
    "/update-session",
    "/sign-out",
  ],
  emailAndPassword: {
    enabled: true,
    // O único usuário inicial nasce pelo bootstrap transacional, nunca por signup público.
    disableSignUp: true,
    minPasswordLength: AUTH_LIMITS.passwordMinLength,
    maxPasswordLength: AUTH_LIMITS.passwordMaxLength,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    changeEmail: { enabled: false },
    deleteUser: { enabled: false },
  },
  account: {
    accountLinking: { enabled: false },
  },
  session: {
    // Teto de transporte do cookie. A validade real é sempre expiresAt/absoluteExpiresAt no banco.
    expiresIn: AUTH_LIMITS.trustedAbsoluteMs / 1000,
    updateAge: AUTH_LIMITS.trustedAbsoluteMs / 1000,
    disableSessionRefresh: true,
    freshAge: AUTH_LIMITS.recentAuthMs / 1000,
    cookieCache: { enabled: false },
    additionalFields: {
      deviceId: { type: "string", required: false, input: false },
      trusted: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      absoluteExpiresAt: { type: "date", required: false, input: false },
      lastAuthAt: { type: "date", required: false, input: false },
      lastActivityAt: { type: "date", required: false, input: false },
    },
  },
  advanced: {
    cookiePrefix: "brain",
    useSecureCookies: config.secureCookies,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.secureCookies,
      path: "/",
    },
    // Mantemos as checagens ligadas; nossas rotas próprias chamam auth.api e
    // por isso fazem a validação de origem explicitamente antes.
    disableCSRFCheck: false,
    disableOriginCheck: false,
    ipAddress: {
      ipAddressHeaders: ["x-brain-client-ip"],
      trustedProxies: config.trustedProxies.length > 0 ? config.trustedProxies : undefined,
    },
  },
  rateLimit: {
    // O handler HTTP da biblioteca não é montado; o throttle é próprio.
    enabled: false,
  },
  telemetry: { enabled: false },
  logger: {
    level: "error",
    log: (level, message) => {
      if (level === "error") console.error("[auth]", message)
      if (level === "warn") console.warn("[auth]", message)
    },
  },
})
