import { sql } from "drizzle-orm"
import { migrate } from "drizzle-orm/node-postgres/migrator"

import { closeDb, db } from "./client.js"
import { instanceSetup } from "./schema/index.js"

const MIGRATION_LOCK_ID = 7_341_229

export async function runMigrations(): Promise<void> {
  await db.execute(sql`select pg_advisory_lock(${MIGRATION_LOCK_ID})`)
  try {
    await migrate(db, { migrationsFolder: "drizzle" })
    await db
      .insert(instanceSetup)
      .values({ id: 1, status: "pending" })
      .onConflictDoNothing()
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${MIGRATION_LOCK_ID})`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log("Migrações aplicadas.")
    })
    .catch((error) => {
      console.error("Falha ao aplicar migrações:", error)
      process.exitCode = 1
    })
    .finally(async () => {
      await closeDb()
    })
}
