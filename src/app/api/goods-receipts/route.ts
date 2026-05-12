import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/error'
import { getSessionProfile, getSessionUser, requireCompany } from '@/lib/api/session'
import { callRpc } from '@/lib/db/rpc'
import { goodsReceiptCreateSchema } from '@/lib/validations/goods-receipt'

export const POST = withApiHandler(async (request: Request) => {
  const user = await getSessionUser()
  const profile = await getSessionProfile()
  requireCompany(profile)

  const body = await request.json()
  const input = goodsReceiptCreateSchema.parse(body)

  const data = await callRpc<string>(
    'SELECT execute_goods_receipt($1::uuid, $2::text, $3::uuid, $4::uuid, $5::date, $6::text, $7::uuid, $8::jsonb) AS result',
    [
      profile.company_id,
      input.receipt_number,
      input.po_id ?? null,
      input.warehouse_id,
      input.receipt_date,
      input.notes ?? null,
      user.id,
      JSON.stringify(input.lines),
    ],
  )

  return NextResponse.json(apiSuccess({ receipt_id: data }), { status: 201 })
})
