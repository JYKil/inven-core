// company_admin 전용: 같은 회사에 사용자 초대 (사용자 생성 + 프로필 등록)
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { withApiHandler } from '@/lib/api/handler'
import { getAuthenticatedUser, requireRole } from '@/lib/api/auth'
import { apiSuccess, ApiError } from '@/lib/api/error'

const inviteSchema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  displayName: z.string().min(1, '이름을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  role: z.enum(['company_admin', 'normal']).default('normal'),
})

export const POST = withApiHandler(async (request: Request) => {
  // 요청자 권한 확인 — company_admin만 가능
  const supabase = await createServerSupabaseClient()
  const { profile } = await getAuthenticatedUser(supabase)
  requireRole(profile, 'company_admin')

  if (!profile.company_id) {
    throw new ApiError(403, '소속 회사가 없습니다', 'FORBIDDEN')
  }

  const body = await request.json()
  const input = inviteSchema.parse(body)

  const adminClient = createAdminSupabaseClient()

  // 이메일 중복 확인
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', input.email)
    .maybeSingle()
  if (existing) throw new ApiError(409, '이미 등록된 이메일입니다', 'DUPLICATE')

  // Auth 사용자 생성
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })
  if (authError) throw new ApiError(400, authError.message, 'AUTH_ERROR')

  // 프로필 생성 — 요청자와 같은 회사에 소속
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: input.email,
      display_name: input.displayName,
      role: input.role,
      company_id: profile.company_id,
    })
  if (profileError) {
    // 프로필 생성 실패 시 Auth 사용자도 삭제 (롤백)
    await adminClient.auth.admin.deleteUser(authData.user.id)
    throw new ApiError(500, '프로필 생성에 실패했습니다', 'INTERNAL_ERROR')
  }

  return NextResponse.json(apiSuccess({
    userId: authData.user.id,
    email: input.email,
    displayName: input.displayName,
    role: input.role,
  }), { status: 201 })
})
