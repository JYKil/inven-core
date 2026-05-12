import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/error'
import { getSessionProfile, getSessionUser } from '@/lib/api/session'
import { callRpc } from '@/lib/db/rpc'
import { assemblyOrderCreateSchema } from '@/lib/validations/assembly'

export const POST = withApiHandler(async (request: Request) => {
  const user = await getSessionUser()
  const profile = await getSessionProfile()

  const body = await request.json()
  const input = assemblyOrderCreateSchema.parse(body)

  const data = await callRpc<string>(
    'SELECT execute_assembly($1::uuid, $2::text, $3::uuid, $4::uuid, $5::uuid, $6::numeric, $7::date, $8::uuid) AS result',
    [
      profile.company_id,
      input.order_number,
      input.bom_header_id,
      input.product_item_id,
      input.warehouse_id,
      input.quantity,
      input.assembly_date,
      user.id,
    ],
  )

  return NextResponse.json(apiSuccess({ order_id: data }), { status: 201 })
})
