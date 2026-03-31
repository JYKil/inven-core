import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withApiHandler } from '@/lib/api/handler'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { apiSuccess, mapSupabaseError } from '@/lib/api/error'
import { warehouseTransferCreateSchema } from '@/lib/validations/warehouse-transfer'

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createServerSupabaseClient()
  const { user, profile } = await getAuthenticatedUser(supabase)

  const body = await request.json()
  const parsed = warehouseTransferCreateSchema.parse(body)

  const { data, error } = await supabase.rpc('execute_transfer', {
    p_company_id: profile.company_id,
    p_from_warehouse_id: parsed.from_warehouse_id,
    p_to_warehouse_id: parsed.to_warehouse_id,
    p_transfer_date: parsed.transfer_date,
    p_notes: parsed.notes ?? undefined,
    p_created_by: user.id,
    p_lines: JSON.stringify(parsed.lines),
  })

  if (error) throw mapSupabaseError(error)

  return NextResponse.json(apiSuccess(data), { status: 201 })
})
