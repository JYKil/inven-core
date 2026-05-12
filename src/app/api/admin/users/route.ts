import { auth } from '@/lib/auth'
import { authDbPool } from '@/lib/db/auth-admin'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const userUpdateSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['super_admin', 'company_admin', 'normal']),
  companyId: z.string().uuid().nullable(),
})

const userActiveSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
})

async function requireSuperAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return { error: NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 }) }
  }

  if (session.user.role !== 'super_admin') {
    return { error: NextResponse.json({ error: '권한이 부족합니다' }, { status: 403 }) }
  }

  return { session }
}

export async function GET() {
  const guard = await requireSuperAdmin()
  if (guard.error) return guard.error

  const [{ rows: users }, { rows: companies }] = await Promise.all([
    authDbPool.query(`
      SELECT
        u.id,
        u.email,
        u.name AS display_name,
        COALESCE(p.role, u.role, 'pending') AS role,
        COALESCE(p.company_id::text, u."companyId") AS company_id,
        COALESCE(p.is_active, true) AS is_active,
        u."createdAt" AS created_at,
        CASE
          WHEN c.id IS NULL THEN NULL
          ELSE json_build_object('id', c.id, 'name', c.name)
        END AS companies
      FROM "user" u
      LEFT JOIN profiles p ON p.id::text = u.id
      LEFT JOIN companies c ON c.id::text = COALESCE(p.company_id::text, u."companyId")
      ORDER BY u."createdAt" DESC
    `),
    authDbPool.query(`
      SELECT id, name
      FROM companies
      WHERE is_active = true
      ORDER BY name
    `),
  ])

  return NextResponse.json({ users, companies })
}

export async function PATCH(request: Request) {
  const guard = await requireSuperAdmin()
  if (guard.error) return guard.error

  const body = await request.json()
  const parsed =
    body.action === 'active'
      ? userActiveSchema.safeParse(body)
      : userUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다' }, { status: 400 })
  }

  if (body.action === 'active') {
    const input = parsed.data as z.infer<typeof userActiveSchema>
    await authDbPool.query(
      'UPDATE profiles SET is_active = $2, updated_at = now() WHERE id = $1::uuid',
      [input.id, input.isActive],
    )
    return NextResponse.json({ success: true })
  }

  const input = parsed.data as z.infer<typeof userUpdateSchema>
  if (input.role !== 'super_admin' && !input.companyId) {
    return NextResponse.json({ error: '회사를 선택해야 합니다' }, { status: 400 })
  }

  const companyId = input.role === 'super_admin' ? null : input.companyId

  const client = await authDbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `
        UPDATE profiles
        SET role = $2, company_id = $3::uuid, updated_at = now()
        WHERE id = $1::uuid
      `,
      [input.id, input.role, companyId],
    )
    await client.query(
      `
        UPDATE "user"
        SET role = $2, "companyId" = $3, "updatedAt" = now()
        WHERE id = $1
      `,
      [input.id, input.role, companyId],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  return NextResponse.json({ success: true })
}
