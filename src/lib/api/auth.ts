// 인증 / 세션 헬퍼
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from './error'

export async function getAuthenticatedUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new ApiError(401, '인증이 필요합니다', 'UNAUTHORIZED')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) throw new ApiError(403, '프로필을 찾을 수 없습니다', 'FORBIDDEN')

  return { user, profile }
}

export function requireRole(profile: { role: string }, ...roles: string[]) {
  if (!roles.includes(profile.role)) {
    throw new ApiError(403, `권한이 부족합니다. 필요: ${roles.join(', ')}`, 'FORBIDDEN')
  }
}
