import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { ApiError, apiSuccess } from '@/lib/api/error'
import { getSessionProfile, getSessionUser, requireCompany } from '@/lib/api/session'
import { callRpc } from '@/lib/db/rpc'

export const POST = withApiHandler(async (_request: Request, context) => {
  const user = await getSessionUser()
  const profile = await getSessionProfile()
  requireCompany(profile)

  const params = await context?.params
  const salesOrderId = params?.id
  if (typeof salesOrderId !== 'string') {
    throw new ApiError(400, '판매주문 ID가 필요합니다', 'VALIDATION_ERROR')
  }

  const data = await callRpc(
    'SELECT execute_shipment($1::uuid, $2::uuid, $3::uuid) AS result',
    [salesOrderId, profile.company_id, user.id],
  )

  return NextResponse.json(apiSuccess(data), { status: 200 })
})
