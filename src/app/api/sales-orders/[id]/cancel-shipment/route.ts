import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/error'
import { getSessionProfile, requireCompany } from '@/lib/api/session'
import { callRpc } from '@/lib/db/rpc'

export const POST = withApiHandler(async (request: Request) => {
  const profile = await getSessionProfile()
  requireCompany(profile)

  // URL에서 id 추출
  const url = new URL(request.url)
  const segments = url.pathname.split('/')
  const salesOrderId = segments[segments.indexOf('sales-orders') + 1]

  // 사유 파싱 (선택)
  const body = await request.json().catch(() => ({}))
  const reason = body.reason || null

  const data = await callRpc(
    'SELECT cancel_shipment($1::uuid, $2::uuid, $3::text) AS result',
    [salesOrderId, profile.company_id, reason],
  )

  return NextResponse.json(apiSuccess(data), { status: 200 })
})
