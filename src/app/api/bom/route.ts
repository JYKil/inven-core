import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/error'
import { getSessionProfile } from '@/lib/api/session'
import { callRpc } from '@/lib/db/rpc'
import { bomHeaderCreateSchema } from '@/lib/validations/bom'

export const POST = withApiHandler(async (request: Request) => {
  const profile = await getSessionProfile()

  const body = await request.json()
  const input = bomHeaderCreateSchema.parse(body)

  const linesPayload = input.lines.map((line, idx) => ({
    material_item_id: line.material_item_id,
    quantity: line.quantity,
    sort_order: line.sort_order ?? idx,
  }))

  const data = await callRpc<string>(
    'SELECT create_bom($1::uuid, $2::uuid, $3::integer, $4::jsonb) AS result',
    [profile.company_id, input.product_item_id, input.version ?? null, JSON.stringify(linesPayload)],
  )

  return NextResponse.json(apiSuccess({ bom_id: data }), { status: 201 })
})
