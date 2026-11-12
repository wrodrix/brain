import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { config } from "../config.js"
import * as schema from "./schema/index.js"

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

export const db = drizzle(pool, { schema })

export async function closeDb(): Promise<void> {
  await pool.end()
}

export type Database = typeof db
