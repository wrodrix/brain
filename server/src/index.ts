import { buildApp } from "./app.js"
import { closeDb } from "./db/client.js"
import { runMigrations } from "./db/migrate.js"
import { config } from "./config.js"

async function main(): Promise<void> {
  await runMigrations()
  const app = await buildApp()
  const host = process.env.HOST ?? "127.0.0.1"

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "encerrando")
    await app.close()
    await closeDb()
    process.exit(0)
  }
  process.on("SIGINT", () => void shutdown("SIGINT"))
  process.on("SIGTERM", () => void shutdown("SIGTERM"))

  await app.listen({ host, port: config.port })
}

main().catch(async (error) => {
  console.error("Falha ao iniciar a API:", error)
  await closeDb().catch(() => undefined)
  process.exit(1)
})
