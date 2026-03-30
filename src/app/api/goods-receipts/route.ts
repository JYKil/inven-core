import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withApiHandler } from '@/lib/api/handler'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { apiSuccess, mapSupabaseError } from '@/lib/api/error'
import { goodsReceiptCreateSchema } from '@/lib/validations/goods-receipt'

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createServerSupabaseClient()
  const { user, profile } = await getAuthenticatedUser(supabase)

  const body = await request.json()
  const input = goodsReceiptCreateSchema.parse(body)

  const { data, error } = await supabase.rpc('execute_goods_receipt', {
    p_company_id: profile.company_id,
    p_receipt_number: input.receipt_number,
    p_po_id: input.po_id ?? undefined,
    p_warehouse_id: input.warehouse_id,
    p_receipt_date: input.receipt_date,
    p_notes: input.notes ?? undefined,
    p_created_by: user.id,
    p_lines: JSON.stringify(input.lines),
  })

  if (error) throw mapSupabaseError(error)

  return NextResponse.json(apiSuccess({ receipt_id: data }), { status: 201 })
})
