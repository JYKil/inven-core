import { auth } from '@/lib/auth'
import { ApiError } from '@/lib/api/error'
import { headers } from 'next/headers'

export type AppProfile = {
  id: string
  email: string
  display_name: string | null
  role: string
  company_id: string | null
  is_active: boolean
}

export async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    throw new ApiError(401, '인증이 필요합니다', 'UNAUTHORIZED')
  }

  return session.user
}

export async function getSessionProfile(): Promise<AppProfile> {
  const user = await getSessionUser()

  return {
    id: user.id,
    email: user.email,
    display_name: user.name ?? user.email,
    role: user.role ?? 'pending',
    company_id: user.companyId ?? null,
    is_active: true,
  }
}

export function requireCompany(profile: AppProfile) {
  if (!profile.company_id && profile.role !== 'super_admin') {
    throw new ApiError(403, '회사 정보가 없습니다', 'FORBIDDEN')
  }
}

export function requireRole(profile: AppProfile, ...roles: string[]) {
  if (!roles.includes(profile.role)) {
    throw new ApiError(403, '권한이 부족합니다', 'FORBIDDEN')
  }
}
