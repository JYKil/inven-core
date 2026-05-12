// 기존 profiles 사용자를 Better Auth user/account 테이블로 이전한다.
// 실행 전 DATABASE_URL을 실제 대상 DB로 설정하세요.
// 출력된 CSV의 temporary_password를 사용자에게 별도 전달하거나 최초 로그인 후 변경하도록 안내하세요.

import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { hashPassword } from 'better-auth/crypto'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL

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

  await client.query('BEGIN')

  for (const profile of profiles) {
    const existing = await client.query('SELECT id FROM "user" WHERE id = $1', [profile.id])
    if (existing.rowCount) continue

    const temporaryPassword = createTemporaryPassword()
    const passwordHash = await hashPassword(temporaryPassword)

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

    issuedPasswords.push({
      email: profile.email,
      temporary_password: temporaryPassword,
      role: profile.role,
      company_id: profile.company_id || '',
    })
  }

  await client.query('COMMIT')

  if (issuedPasswords.length > 0) {
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

  console.log(`이전 완료: ${issuedPasswords.length}명`)
  console.log('임시 비밀번호 파일: better-auth-temporary-passwords.csv')
} catch (error) {
  await client.query('ROLLBACK')
  console.error('이전 실패:', error)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
