// 회원가입 후 pending 프로필 생성 + super_admin 알림 메일 발송
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { sendNewUserNotification } from '@/lib/email/resend'

export async function POST() {
  try {
    // 현재 로그인된 사용자 확인
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 이미 프로필이 있는지 확인
    const adminClient = createAdminSupabaseClient()
    const { data: existing } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: '이미 등록된 사용자입니다' },
        { status: 409 }
      )
    }

    const displayName = user.user_metadata?.display_name
      || user.email?.split('@')[0]
      || ''
    const email = user.email ?? ''

    // 첫 번째 사용자 → super_admin으로 자동 승격
    const { count } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
    const isFirstUser = (count ?? 0) === 0
    const role = isFirstUser ? 'super_admin' : 'pending'

    const { error: insertError } = await adminClient
      .from('profiles')
      .insert({
        id: user.id,
        company_id: null,
        role,
        display_name: displayName,
        email,
      })

    if (insertError) {
      // PK 중복 (동시 요청) → 이미 등록된 것으로 처리
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: '이미 등록된 사용자입니다' },
          { status: 409 }
        )
      }
      console.error('[register-pending] 프로필 생성 실패:', insertError)
      return NextResponse.json(
        { error: '프로필 생성에 실패했습니다' },
        { status: 500 }
      )
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
