// Better Auth 테이블 마이그레이션 스크립트
// 실행: node scripts/migrate-better-auth.mjs

import { betterAuth } from 'better-auth'
import { existsSync } from 'node:fs'
import { Pool } from 'pg'

async function loadLocalEnv() {
  if (!existsSync('.env.local')) return

  const { readFile } = await import('node:fs/promises')
  const content = await readFile('.env.local', 'utf8')

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex)
    const value = trimmed.slice(separatorIndex + 1)
    process.env[key] ??= value
  }
}

await loadLocalEnv()

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL 환경변수가 필요합니다')
  process.exit(1)
}

if (!process.env.BETTER_AUTH_SECRET) {
  console.error('BETTER_AUTH_SECRET 환경변수가 필요합니다')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
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
