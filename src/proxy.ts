import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// 인증 없이 접근 가능한 경로
const publicPaths = ['/login', '/signup', '/auth/callback']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 공개 경로는 세션 갱신만 수행
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return await updateSession(request)
  }

  // 세션 갱신 + 인증 확인
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 미인증 → 로그인 페이지로 리다이렉트
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 인증됨 + 프로필 상태 확인
  if (pathname !== '/onboarding' && pathname !== '/pending') {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    // DB 에러 시 안전하게 차단 (fail-closed)
    if (profileError && profileError.code !== 'PGRST116') {
      const pendingUrl = request.nextUrl.clone()
      pendingUrl.pathname = '/pending'
      return NextResponse.redirect(pendingUrl)
    }

    // 프로필 없으면 온보딩으로 (pending 프로필 생성)
    if (!profile) {
      const onboardingUrl = request.nextUrl.clone()
      onboardingUrl.pathname = '/onboarding'
      return NextResponse.redirect(onboardingUrl)
    }

    // pending 상태면 승인 대기 페이지로
    if (profile.role === 'pending') {
      const pendingUrl = request.nextUrl.clone()
      pendingUrl.pathname = '/pending'
      return NextResponse.redirect(pendingUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
