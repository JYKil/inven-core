import { auth } from '@/lib/auth'
import { splitSetCookieHeader } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

// 인증 없이 접근 가능한 경로
const publicPaths = ['/login', '/signup', '/auth/callback', '/api/auth']
const authOnlyPaths = ['/pending']

type AuthUser = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>['user']

function isPathMatch(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function createRedirect(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  return NextResponse.redirect(url)
}

function applyAuthHeaders(response: NextResponse, headers: Headers) {
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      for (const cookie of splitSetCookieHeader(value)) {
        response.headers.append(key, cookie)
      }
      return
    }

    response.headers.set(key, value)
  })

  return response
}

function isPendingUser(user: AuthUser) {
  return user.role === 'pending'
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sessionResult = await auth.api.getSession({
    headers: request.headers,
    returnHeaders: true,
  })
  const session = sessionResult.response

  if (isPathMatch(pathname, publicPaths)) {
    return applyAuthHeaders(NextResponse.next({ request }), sessionResult.headers)
  }

  // 미인증 → 로그인 페이지로 리다이렉트
  if (!session) {
    return applyAuthHeaders(createRedirect(request, '/login'), sessionResult.headers)
  }

  // pending 상태면 승인 대기 페이지로
  if (!isPathMatch(pathname, authOnlyPaths) && isPendingUser(session.user)) {
    return applyAuthHeaders(createRedirect(request, '/pending'), sessionResult.headers)
  }

  return applyAuthHeaders(NextResponse.next({ request }), sessionResult.headers)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
