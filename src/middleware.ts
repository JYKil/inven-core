import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// 인증 없이 접근 가능한 경로
const publicPaths = ['/login', '/signup', '/auth/callback']

export async function middleware(request: NextRequest) {
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

  // 인증됨 + 온보딩 미완료 확인 (프로필 없으면 온보딩으로)
  if (pathname !== '/onboarding') {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    // DB 에러 시 프로필 없음으로 오판하지 않고 그대로 통과
    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = "not found" (0 rows) → 온보딩 필요
      // 그 외 에러(네트워크 등) → 차단하지 않고 통과
      return supabaseResponse
    }

    if (!profile) {
      const onboardingUrl = request.nextUrl.clone()
      onboardingUrl.pathname = '/onboarding'
      return NextResponse.redirect(onboardingUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
