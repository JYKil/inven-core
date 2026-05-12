// 기존 profiles 사용자를 Better Auth user/account 테이블로 이전한다.
// 실행 전 DATABASE_URL을 실제 대상 DB로 설정하세요. DATABASE_URL이 없으면 .env.local을 읽습니다.
// 사전 확인: node scripts/migrate-auth-users-from-profiles.mjs --dry-run
// 출력된 CSV의 temporary_password를 사용자에게 별도 전달하거나 최초 로그인 후 변경하도록 안내하세요.

import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { hashPassword } from 'better-auth/crypto'
import { Pool } from 'pg'

async function loadLocalEnv() {
  if (process.env.DATABASE_URL || !existsSync('.env.local')) return

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

const databaseUrl = process.env.DATABASE_URL
const isDryRun = process.argv.includes('--dry-run')

if (!databaseUrl) {
  console.error('DATABASE_URL 환경변수가 필요합니다')
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl })

function createTemporaryPassword() {
  return `Inv-${randomUUID().replaceAll('-', '').slice(0, 20)}!`
}

const client = await pool.connect()

try {
  const { rows: profiles } = await client.query(`
    SELECT id::text, email, display_name, role, company_id::text
    FROM profiles
    WHERE is_active = true
    ORDER BY created_at
  `)

  const issuedPasswords = []
  let skippedUsers = 0

  await client.query('BEGIN')

  for (const profile of profiles) {
    const existing = await client.query('SELECT id FROM "user" WHERE id = $1', [profile.id])
    if (existing.rowCount) {
      skippedUsers += 1
      continue
    }

    const temporaryPassword = createTemporaryPassword()
    const passwordHash = await hashPassword(temporaryPassword)

    if (!isDryRun) {
      await client.query(
        `
          INSERT INTO "user" (
            id, name, email, "emailVerified", image,
            "createdAt", "updatedAt", role, "companyId"
          )
          VALUES ($1, $2, $3, true, null, now(), now(), $4, $5)
        `,
        [
          profile.id,
          profile.display_name || profile.email.split('@')[0],
          profile.email,
          profile.role,
          profile.company_id,
        ],
      )

      await client.query(
        `
          INSERT INTO account (
            id, "accountId", "providerId", "userId", password,
            "createdAt", "updatedAt"
          )
          VALUES ($1, $2, 'credential', $3, $4, now(), now())
        `,
        [randomUUID(), profile.id, profile.id, passwordHash],
      )
    }

    issuedPasswords.push({
      email: profile.email,
      temporary_password: temporaryPassword,
      role: profile.role,
      company_id: profile.company_id || '',
    })
  }

  if (isDryRun) {
    await client.query('ROLLBACK')
  } else {
    await client.query('COMMIT')
  }

  if (!isDryRun && issuedPasswords.length > 0) {
    const csv = [
      'email,temporary_password,role,company_id',
      ...issuedPasswords.map((row) =>
        [row.email, row.temporary_password, row.role, row.company_id]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      ),
    ].join('\n')

    await writeFile('better-auth-temporary-passwords.csv', `${csv}\n`, { mode: 0o600 })
  }

  if (isDryRun) {
    console.log(`이전 대상: ${issuedPasswords.length}명`)
    console.log(`이미 이전됨: ${skippedUsers}명`)
    console.log('dry-run 완료: DB 변경 없음')
  } else {
    console.log(`이전 완료: ${issuedPasswords.length}명`)
    console.log(`이미 이전되어 건너뜀: ${skippedUsers}명`)
    console.log('임시 비밀번호 파일: better-auth-temporary-passwords.csv')
  }
} catch (error) {
  await client.query('ROLLBACK')
  console.error('이전 실패:', error)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
