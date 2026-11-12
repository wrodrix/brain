try {
  process.loadEnvFile?.()
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
}

process.env.NODE_ENV = "test"
process.env.BRAIN_TEST_MODE = "1"
process.env.BETTER_AUTH_URL = "http://127.0.0.1:5173"
process.env.BRAIN_PUBLIC_ORIGIN = "http://127.0.0.1:5173"
process.env.BRAIN_SECURE_COOKIES = "false"
process.env.BRAIN_TRUST_PROXY = "false"

const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL é obrigatório para os testes de servidor")
}
process.env.DATABASE_URL = testDatabaseUrl
