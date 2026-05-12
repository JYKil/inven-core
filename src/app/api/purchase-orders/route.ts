import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/error'
import { getSessionProfile, getSessionUser, requireCompany } from '@/lib/api/session'
import { callRpc } from '@/lib/db/rpc'
import { poCreateSchema } from '@/lib/validations/purchase-order'

export const POST = withApiHandler(async (request: Request) => {
  const user = await getSessionUser()
  const profile = await getSessionProfile()
  requireCompany(profile)

  const body = await request.json()
  const input = poCreateSchema.parse(body)

  const lines = input.lines.map((l) => ({
      line_type: l.line_type,
      item_id: l.line_type === 'inventory' ? l.item_id : null,
      description: l.line_type === 'expense' ? l.description : null,
      ordered_qty: l.line_type === 'inventory' ? l.ordered_qty : 0,
      unit_price: l.line_type === 'inventory' ? l.unit_price : 0,
      line_amount: l.line_type === 'expense' ? l.line_amount : 0,
    }))
  const data = await callRpc<string>(
    'SELECT create_purchase_order($1::uuid, $2::uuid, $3::text, $4::uuid, $5::date, $6::date, $7::text, $8::jsonb) AS result',
    [
      profile.company_id,
      user.id,
      input.po_number,
      input.vendor_id,
      input.order_date,
      input.expected_date ?? null,
      input.notes ?? null,
      JSON.stringify(lines),
    ],
  )

  return NextResponse.json(apiSuccess({ po_id: data }), { status: 201 })
})
