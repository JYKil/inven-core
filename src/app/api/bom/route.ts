import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withApiHandler } from '@/lib/api/handler'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { apiSuccess, mapSupabaseError } from '@/lib/api/error'
import { bomHeaderCreateSchema } from '@/lib/validations/bom'

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createServerSupabaseClient()
  const { profile } = await getAuthenticatedUser(supabase)

  const body = await request.json()
  const input = bomHeaderCreateSchema.parse(body)

  const linesPayload = input.lines.map((line, idx) => ({
    material_item_id: line.material_item_id,
    quantity: line.quantity,
    sort_order: line.sort_order ?? idx,
  }))

  const { data, error } = await supabase.rpc('create_bom', {
    p_company_id: profile.company_id,
    p_product_item_id: input.product_item_id,
    p_version: input.version ?? undefined,
    p_lines: linesPayload,
  })

  if (error) throw mapSupabaseError(error)

  return NextResponse.json(apiSuccess({ bom_id: data }), { status: 201 })
})
