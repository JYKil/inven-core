import { describe, it, expect, vi } from 'vitest'
import { getAuthenticatedUser, requireRole } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/error'

// Supabase 클라이언트 mock 생성 헬퍼
function createMockSupabase({
  user = { id: 'user-1' },
  userError = null as unknown,
  profile = { company_id: 'comp-1', role: 'normal' },
}: {
  user?: { id: string } | null
  userError?: unknown
  profile?: { company_id: string; role: string } | null
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: userError,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: profile, error: null }),
        }),
      }),
    }),
  } as any
}

describe('getAuthenticatedUser', () => {
  it('인증된 사용자와 프로필을 반환한다', async () => {
    const supabase = createMockSupabase()
    const result = await getAuthenticatedUser(supabase)

    expect(result.user.id).toBe('user-1')
    expect(result.profile.company_id).toBe('comp-1')
    expect(result.profile.role).toBe('normal')
  })

  it('인증 실패 시 401 ApiError', async () => {
    const supabase = createMockSupabase({
      user: null,
      userError: { message: 'invalid token' },
    })

    await expect(getAuthenticatedUser(supabase)).rejects.toThrow(ApiError)
    await expect(getAuthenticatedUser(supabase)).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    })
  })

  it('프로필 없음 시 403 ApiError', async () => {
    const supabase = createMockSupabase({ profile: null })

    await expect(getAuthenticatedUser(supabase)).rejects.toThrow(ApiError)
    await expect(getAuthenticatedUser(supabase)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    })
  })
})

describe('requireRole', () => {
  it('허용된 역할이면 에러 없음', () => {
    expect(() => requireRole({ role: 'company_admin' }, 'company_admin', 'super_admin')).not.toThrow()
  })

  it('허용되지 않은 역할이면 403 ApiError', () => {
    expect(() => requireRole({ role: 'normal' }, 'company_admin')).toThrow(ApiError)
    try {
      requireRole({ role: 'normal' }, 'company_admin')
    } catch (e) {
      const err = e as ApiError
      expect(err.statusCode).toBe(403)
      expect(err.code).toBe('FORBIDDEN')
      expect(err.message).toContain('company_admin')
    }
  })

  it('여러 역할 중 하나라도 일치하면 통과', () => {
    expect(() => requireRole({ role: 'super_admin' }, 'company_admin', 'super_admin')).not.toThrow()
  })
})
