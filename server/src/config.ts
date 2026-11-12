import { z } from "zod"

try {
  process.loadEnvFile?.()
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
}

const booleanString = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1")

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET precisa de pelo menos 32 caracteres"),
  BETTER_AUTH_URL: z.string().url().default("http://127.0.0.1:5173"),
  BRAIN_PUBLIC_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  BRAIN_TRUST_PROXY: z.string().default("false"),
  BRAIN_TRUSTED_PROXIES: z.string().optional(),
  BRAIN_SECURE_COOKIES: booleanString.optional(),
  BRAIN_SETUP_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),
  BRAIN_TEST_MODE: z.enum(["0", "1"]).default("0"),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
  throw new Error(`Configuração inválida:\n${details.join("\n")}`)
}

const env = parsed.data
const publicOrigin = new URL(env.BRAIN_PUBLIC_ORIGIN).origin
const authUrl = new URL(env.BETTER_AUTH_URL).origin
const trustedOrigins = Array.from(new Set([publicOrigin, authUrl]))

const secureCookies =
  env.BRAIN_SECURE_COOKIES ??
  (env.NODE_ENV === "production" ? publicOrigin.startsWith("https://") : false)

const trustProxyValue = env.BRAIN_TRUST_PROXY.trim().toLowerCase()
if (
  (trustProxyValue === "true" || trustProxyValue === "1") &&
  !env.BRAIN_TRUSTED_PROXIES
) {
  throw new Error("BRAIN_TRUSTED_PROXIES é obrigatório quando BRAIN_TRUST_PROXY=true")
}
const trustProxy =
  trustProxyValue === "true" || trustProxyValue === "1"
    ? env.BRAIN_TRUSTED_PROXIES!.split(",").map((item) => item.trim()).filter(Boolean)
    : false

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  authSecret: env.BETTER_AUTH_SECRET,
  authUrl,
  publicOrigin,
  trustedOrigins,
  secureCookies,
  trustProxy,
  trustedProxies: env.BRAIN_TRUSTED_PROXIES
    ? env.BRAIN_TRUSTED_PROXIES.split(",").map((item) => item.trim()).filter(Boolean)
    : [],
  setupTokenTtlHours: env.BRAIN_SETUP_TOKEN_TTL_HOURS,
  testMode: env.NODE_ENV === "test" && env.BRAIN_TEST_MODE === "1",
} as const

export type AppConfig = typeof config
