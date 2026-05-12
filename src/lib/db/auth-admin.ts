import { Pool } from 'pg'

const globalForAuthDb = globalThis as typeof globalThis & {
  authDbPool?: Pool
}

export const authDbPool =
  globalForAuthDb.authDbPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForAuthDb.authDbPool = authDbPool
}

export async function updateBetterAuthUserRole({
  userId,
  role,
  companyId,
}: {
  userId: string
  role: string
  companyId: string | null
}) {
  await authDbPool.query(
    `
      UPDATE "user"
      SET role = $2, "companyId" = $3, "updatedAt" = now()
      WHERE id = $1
    `,
    [userId, role, companyId],
  )
}
