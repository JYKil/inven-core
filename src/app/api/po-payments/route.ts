import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/error'
import { getSessionProfile, requireCompany } from '@/lib/api/session'
import { callRpc } from '@/lib/db/rpc'
import { poPaymentCreateSchema } from '@/lib/validations/po-payment'

export const POST = withApiHandler(async (request: Request) => {
  const profile = await getSessionProfile()
  requireCompany(profile)

  const body = await request.json()
  const input = poPaymentCreateSchema.parse(body)

  const data = await callRpc<string>(
    'SELECT create_po_payment($1::uuid, $2::uuid, $3::date, $4::numeric, $5::text, $6::text) AS result',
    [
      profile.company_id,
      input.po_id,
      input.payment_date,
      input.amount,
      input.payment_method ?? null,
      input.notes ?? null,
    ],
  )

  return NextResponse.json(apiSuccess({ payment_id: data }), { status: 201 })
})
