import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/error'
import { getSessionProfile, requireCompany } from '@/lib/api/session'
import { callRpc } from '@/lib/db/rpc'
import { z } from 'zod'

const bomVersionCreateSchema = z.object({
  source_bom_id: z.string().uuid('원본 BOM을 선택해주세요'),
  product_item_id: z.string().uuid('결과품목을 선택해주세요'),
})

export const POST = withApiHandler(async (request: Request) => {
  const profile = await getSessionProfile()
  requireCompany(profile)

  const body = await request.json()
  const input = bomVersionCreateSchema.parse(body)

  const data = await callRpc<string>(
    'SELECT create_bom_version($1::uuid, $2::uuid, $3::uuid) AS result',
    [profile.company_id, input.source_bom_id, input.product_item_id],
  )

  return NextResponse.json(apiSuccess({ bom_id: data }), { status: 201 })
})
