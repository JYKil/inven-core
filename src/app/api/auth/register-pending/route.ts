// 회원가입 후 pending 프로필 생성 + super_admin 알림 메일 발송
import { auth } from '@/lib/auth'
import { authDbPool } from '@/lib/db/auth-admin'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { sendNewUserNotification } from '@/lib/email/resend'

export async function POST() {
  try {
    // 현재 로그인된 사용자 확인
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    const user = session?.user

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 이미 프로필이 있는지 확인
    const existing = await authDbPool.query<{ role: string; company_id: string | null }>(
      'SELECT role, company_id::text FROM profiles WHERE id = $1::uuid',
      [user.id],
    )

    if (existing.rowCount && existing.rows[0]) {
      const profile = existing.rows[0]
      await authDbPool.query(
        `
          UPDATE "user"
          SET role = $2, "companyId" = $3, "updatedAt" = now()
          WHERE id = $1
        `,
        [user.id, profile.role, profile.company_id],
      )
      return NextResponse.json({ success: true, role: profile.role })
    }

    const displayName = user.name || user.email?.split('@')[0] || ''
    const email = user.email
    if (!email) {
      return NextResponse.json(
        { error: '이메일 정보가 없습니다' },
        { status: 400 },
      )
    }

    // 첫 번째 사용자 → super_admin으로 자동 승격
    const { rows: [{ count }] } = await authDbPool.query<{ count: string }>(
      'SELECT COUNT(*)::int AS count FROM profiles',
    )
    const isFirstUser = Number(count) === 0
    const role = isFirstUser ? 'super_admin' : 'pending'
    const companyId = null

    const client = await authDbPool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `
          INSERT INTO profiles (id, company_id, role, display_name, email)
          VALUES ($1::uuid, $2::uuid, $3, $4, $5)
        `,
        [user.id, companyId, role, displayName, email],
      )
      await client.query(
        `
          UPDATE "user"
          SET role = $2, "companyId" = $3, "updatedAt" = now()
          WHERE id = $1
        `,
        [user.id, role, companyId],
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: '이미 등록된 사용자입니다' },
          { status: 409 },
        )
      }
      console.error('[register-pending] 프로필 생성 실패:', error)
      return NextResponse.json(
        { error: '프로필 생성에 실패했습니다' },
        { status: 500 },
      )
    } finally {
      client.release()
    }

    // 첫 번째 사용자(super_admin)는 알림 불필요
    if (!isFirstUser) {
      await sendNewUserNotification(email, displayName)
    }

    return NextResponse.json({ success: true, role })
  } catch (error) {
    console.error('[register-pending] 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
