// Supabase keep-alive용 헬스체크 — 실제 DB 조회를 발생시켜 무료 플랜 자동 pause를 방지한다
import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
