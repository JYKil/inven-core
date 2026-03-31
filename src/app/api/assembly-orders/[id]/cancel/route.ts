import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withApiHandler } from '@/lib/api/handler'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { apiSuccess, mapSupabaseError } from '@/lib/api/error'

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createServerSupabaseClient()
  const { profile } = await getAuthenticatedUser(supabase)

  // URL에서 id 추출
  const url = new URL(request.url)
  const segments = url.pathname.split('/')
  const assemblyOrderId = segments[segments.indexOf('assembly-orders') + 1]

  // 사유 파싱 (선택)
  const body = await request.json().catch(() => ({}))
  const reason = body.reason || null

  const { data, error } = await supabase.rpc('cancel_assembly' as never, {
    p_assembly_order_id: assemblyOrderId,
    p_company_id: profile.company_id,
    p_reason: reason,
  } as never)

  if (error) throw mapSupabaseError(error)

  return NextResponse.json(apiSuccess(data), { status: 200 })
})
