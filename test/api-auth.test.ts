import { describe, it, expect } from 'vitest'
import { requireRole, type AppProfile } from '@/lib/api/session'
import { ApiError } from '@/lib/api/error'

const profile: AppProfile = {
  id: 'user-1',
  email: 'user@example.com',
  display_name: 'User',
  role: 'normal',
  company_id: 'comp-1',
  is_active: true,
}

describe('requireRole', () => {
  it('허용된 역할이면 에러 없음', () => {
    expect(() => requireRole({ ...profile, role: 'company_admin' }, 'company_admin', 'super_admin')).not.toThrow()
  })

  it('허용되지 않은 역할이면 403 ApiError', () => {
    expect(() => requireRole(profile, 'company_admin')).toThrow(ApiError)
    try {
      requireRole(profile, 'company_admin')
    } catch (e) {
      const err = e as ApiError
      expect(err.statusCode).toBe(403)
      expect(err.code).toBe('FORBIDDEN')
    }
  })

  it('여러 역할 중 하나라도 일치하면 통과', () => {
    expect(() => requireRole({ ...profile, role: 'super_admin' }, 'company_admin', 'super_admin')).not.toThrow()
  })
})
