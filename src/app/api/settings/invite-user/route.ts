// company_admin 전용: 같은 회사에 사용자 초대 (사용자 생성 + 프로필 등록)
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withApiHandler } from '@/lib/api/handler'
import { apiSuccess, ApiError } from '@/lib/api/error'
import { getSessionProfile, requireRole } from '@/lib/api/session'
import { authDbPool } from '@/lib/db/auth-admin'
import { hashPassword } from 'better-auth/crypto'
import { randomUUID } from 'crypto'

const inviteSchema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  displayName: z.string().min(1, '이름을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  role: z.enum(['company_admin', 'normal']).default('normal'),
})

export const POST = withApiHandler(async (request: Request) => {
  const profile = await getSessionProfile()
  requireRole(profile, 'company_admin')

  if (!profile.company_id) {
    throw new ApiError(403, '소속 회사가 없습니다', 'FORBIDDEN')
  }

  const body = await request.json()
  const input = inviteSchema.parse(body)

  const client = await authDbPool.connect()
  const userId = randomUUID()
  const accountId = randomUUID()
  const passwordHash = await hashPassword(input.password)

  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT id FROM profiles WHERE email = $1 UNION SELECT id FROM "user" WHERE email = $1', [input.email])
    if (existing.rowCount) throw new ApiError(409, '이미 등록된 이메일입니다', 'DUPLICATE')

    await client.query(
      `
        INSERT INTO "user" (
          id, name, email, "emailVerified", image,
          "createdAt", "updatedAt", role, "companyId"
        )
        VALUES ($1, $2, $3, true, null, now(), now(), $4, $5)
      `,
      [userId, input.displayName, input.email, input.role, profile.company_id],
    )
    await client.query(
      `
        INSERT INTO account (
          id, "accountId", "providerId", "userId", password,
          "createdAt", "updatedAt"
        )
        VALUES ($1, $2, 'credential', $3, $4, now(), now())
      `,
      [accountId, userId, userId, passwordHash],
    )
    await client.query(
      `
        INSERT INTO profiles (id, email, display_name, role, company_id)
        VALUES ($1::uuid, $2, $3, $4, $5::uuid)
      `,
      [userId, input.email, input.displayName, input.role, profile.company_id],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    if (error instanceof ApiError) throw error
    if ((error as { code?: string }).code === '23505') {
      throw new ApiError(409, '이미 등록된 이메일입니다', 'DUPLICATE')
    }
    throw error
  } finally {
    client.release()
  }

  return NextResponse.json(apiSuccess({
    userId,
    email: input.email,
    displayName: input.displayName,
    role: input.role,
  }), { status: 201 })
})
