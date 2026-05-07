// Better Auth 테이블 마이그레이션 스크립트
// 실행: node scripts/migrate-better-auth.mjs

import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

process.env.DATABASE_URL = 'postgresql://inven:2401@192.168.75.205:5432/inven_db'
process.env.BETTER_AUTH_SECRET = '331baaf4c2f0735da81fc12ed9fb6ad4dde58bff9ae60e62e882919a948ffa74'
process.env.BETTER_AUTH_URL = 'http://localhost:3000'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'pending',
        input: false,
      },
      companyId: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
})

const { getMigrations } = await import('better-auth/db/migration')
const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options)

if (toBeCreated.length === 0 && toBeAdded.length === 0) {
  console.log('마이그레이션할 항목 없음')
  await pool.end()
  process.exit(0)
}

console.log('생성할 테이블:', toBeCreated.map((t) => t.table))
console.log('추가할 컬럼:', toBeAdded.map((t) => `${t.table}.${t.fields.join(', ')}`))

await runMigrations()
console.log('마이그레이션 완료')
await pool.end()
