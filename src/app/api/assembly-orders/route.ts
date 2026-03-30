import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withApiHandler } from '@/lib/api/handler'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { apiSuccess, mapSupabaseError } from '@/lib/api/error'
import { assemblyOrderCreateSchema } from '@/lib/validations/assembly'

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createServerSupabaseClient()
  const { user, profile } = await getAuthenticatedUser(supabase)

  const body = await request.json()
  const input = assemblyOrderCreateSchema.parse(body)

  const { data, error } = await supabase.rpc('execute_assembly', {
    p_company_id: profile.company_id,
    p_order_number: input.order_number,
    p_bom_header_id: input.bom_header_id,
    p_product_item_id: input.product_item_id,
    p_warehouse_id: input.warehouse_id,
    p_quantity: input.quantity,
    p_assembly_date: input.assembly_date,
    p_created_by: user.id,
  })

  if (error) throw mapSupabaseError(error)

  return NextResponse.json(apiSuccess({ order_id: data }), { status: 201 })
})
