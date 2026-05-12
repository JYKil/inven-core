import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/error'
import { getSessionProfile, getSessionUser, requireCompany } from '@/lib/api/session'
import { callRpc } from '@/lib/db/rpc'
import { warehouseTransferCreateSchema } from '@/lib/validations/warehouse-transfer'

export const POST = withApiHandler(async (request: Request) => {
  const user = await getSessionUser()
  const profile = await getSessionProfile()
  requireCompany(profile)

  const body = await request.json()
  const parsed = warehouseTransferCreateSchema.parse(body)

  const data = await callRpc(
    'SELECT execute_transfer($1::uuid, $2::uuid, $3::uuid, $4::date, $5::text, $6::uuid, $7::jsonb) AS result',
    [
      profile.company_id,
      parsed.from_warehouse_id,
      parsed.to_warehouse_id,
      parsed.transfer_date,
      parsed.notes ?? null,
      user.id,
      JSON.stringify(parsed.lines),
    ],
  )

  return NextResponse.json(apiSuccess(data), { status: 201 })
})
