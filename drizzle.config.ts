import { defineConfig } from "drizzle-kit"

try {
  process.loadEnvFile?.()
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
}

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL é obrigatório para drizzle-kit")

export default defineConfig({
  schema: "./server/src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
