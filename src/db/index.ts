import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const globalForDb = globalThis as typeof globalThis & {
  dbPool?: Pool
}

export const dbPool =
  globalForDb.dbPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbPool = dbPool
}

export const db = drizzle(dbPool, { schema })

export type Db = typeof db
