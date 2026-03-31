import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withApiHandler } from '@/lib/api/handler'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { apiSuccess, mapSupabaseError } from '@/lib/api/error'

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createServerSupabaseClient()
  const { user, profile } = await getAuthenticatedUser(supabase)

  // URL에서 id 추출
  const url = new URL(request.url)
  const segments = url.pathname.split('/')
  const salesOrderId = segments[segments.indexOf('sales-orders') + 1]

  const { data, error } = await supabase.rpc('execute_shipment', {
    p_sales_order_id: salesOrderId,
    p_company_id: profile.company_id,
    p_created_by: user.id,
  })

  if (error) throw mapSupabaseError(error)

  return NextResponse.json(apiSuccess(data), { status: 200 })
})
