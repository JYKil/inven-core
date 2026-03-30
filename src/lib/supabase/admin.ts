// 관리자 전용 Supabase 클라이언트 (service_role 키 사용)
// 사용자 생성 등 Auth Admin API 호출에만 사용
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다')
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
