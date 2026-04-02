import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withApiHandler } from '@/lib/api/handler'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { apiSuccess, mapSupabaseError } from '@/lib/api/error'
import { poPaymentCreateSchema } from '@/lib/validations/po-payment'

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createServerSupabaseClient()
  const { profile } = await getAuthenticatedUser(supabase)

  const body = await request.json()
  const input = poPaymentCreateSchema.parse(body)

  const { data, error } = await supabase.rpc('create_po_payment', {
    p_company_id: profile.company_id,
    p_po_id: input.po_id,
    p_payment_date: input.payment_date,
    p_amount: input.amount,
    p_payment_method: input.payment_method ?? undefined,
    p_notes: input.notes ?? undefined,
  })

  if (error) throw mapSupabaseError(error)

  return NextResponse.json(apiSuccess({ payment_id: data }), { status: 201 })
})
