import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withApiHandler } from '@/lib/api/handler'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { apiSuccess, mapSupabaseError } from '@/lib/api/error'
import { z } from 'zod'

const bomVersionCreateSchema = z.object({
  source_bom_id: z.string().uuid('원본 BOM을 선택해주세요'),
  product_item_id: z.string().uuid('결과품목을 선택해주세요'),
})

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createServerSupabaseClient()
  const { profile } = await getAuthenticatedUser(supabase)

  const body = await request.json()
  const input = bomVersionCreateSchema.parse(body)

  const { data, error } = await supabase.rpc('create_bom_version', {
    p_company_id: profile.company_id,
    p_source_bom_id: input.source_bom_id,
    p_product_item_id: input.product_item_id,
  })

  if (error) throw mapSupabaseError(error)

  return NextResponse.json(apiSuccess({ bom_id: data }), { status: 201 })
})
