'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/database'

type PoPayment = Database['public']['Tables']['po_payments']['Row']

export function usePoPayments(filters: ListFilters = {}) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.poPayments.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('po_payments')
        .select(`
          *,
          purchase_order:purchase_orders!po_payments_po_id_fkey(id, po_number, total_amount, vendor:vendors!purchase_orders_vendor_id_fkey(name))
        `, { count: 'exact' })
        .order('payment_date', { ascending: false })

      if (filters.search) {
        // PO 번호로 검색은 join 필터 불가 — 전체 조회
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data ?? [], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

// PO별 지급 이력
export function usePoPaymentsByPo(poId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.poPayments.byPo(poId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_payments')
        .select('*')
        .eq('po_id', poId)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!poId,
  })
}

export function useCreatePoPayment() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      po_id: string
      payment_date: string
      amount: number
      payment_method?: string
      notes?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const { data, error } = await supabase
        .from('po_payments')
        .insert({
          company_id: profile.company_id,
          po_id: input.po_id,
          payment_date: input.payment_date,
          amount: input.amount,
          payment_method: input.payment_method || null,
          notes: input.notes || null,
        })
        .select()
        .single()
      if (error) throw error
      return data as PoPayment
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.poPayments.all })
      qc.invalidateQueries({ queryKey: queryKeys.poPayments.byPo(variables.po_id) })
    },
  })
}
