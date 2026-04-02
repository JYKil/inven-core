import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withApiHandler } from '@/lib/api/handler'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { apiSuccess, mapSupabaseError } from '@/lib/api/error'
import { poCreateSchema } from '@/lib/validations/purchase-order'

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createServerSupabaseClient()
  const { user, profile } = await getAuthenticatedUser(supabase)

  const body = await request.json()
  const input = poCreateSchema.parse(body)

  const { data, error } = await supabase.rpc('create_purchase_order', {
    p_company_id: profile.company_id,
    p_created_by: user.id,
    p_po_number: input.po_number,
    p_vendor_id: input.vendor_id,
    p_order_date: input.order_date,
    p_expected_date: input.expected_date ?? undefined,
    p_notes: input.notes ?? undefined,
    p_lines: input.lines.map((l) => ({
      line_type: l.line_type,
      item_id: l.line_type === 'inventory' ? l.item_id : null,
      description: l.line_type === 'expense' ? l.description : null,
      ordered_qty: l.line_type === 'inventory' ? l.ordered_qty : 0,
      unit_price: l.line_type === 'inventory' ? l.unit_price : 0,
      line_amount: l.line_type === 'expense' ? l.line_amount : 0,
    })),
  })

  if (error) throw mapSupabaseError(error)

  return NextResponse.json(apiSuccess({ po_id: data }), { status: 201 })
})
