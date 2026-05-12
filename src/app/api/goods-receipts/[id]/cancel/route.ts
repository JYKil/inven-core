import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { ApiError, apiSuccess } from '@/lib/api/error'
import { getSessionProfile, requireCompany } from '@/lib/api/session'
import { callRpc } from '@/lib/db/rpc'

export const POST = withApiHandler(async (request: Request, context) => {
  const profile = await getSessionProfile()
  requireCompany(profile)

  const params = await context?.params
  const goodsReceiptId = params?.id
  if (typeof goodsReceiptId !== 'string') {
    throw new ApiError(400, '입고 ID가 필요합니다', 'VALIDATION_ERROR')
  }

  // 사유 파싱 (선택)
  const body = await request.json().catch(() => ({}))
  const reason = body.reason || null

  const data = await callRpc(
    'SELECT cancel_goods_receipt($1::uuid, $2::uuid, $3::text) AS result',
    [goodsReceiptId, profile.company_id, reason],
  )

  return NextResponse.json(apiSuccess(data), { status: 200 })
})
