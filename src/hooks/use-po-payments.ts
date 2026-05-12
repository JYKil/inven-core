'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createDbClient } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/database'

type PoPayment = Database['public']['Tables']['po_payments']['Row']

export function usePoPayments(filters: ListFilters = {}) {
  const dbClient = createDbClient()
  return useQuery({
    queryKey: queryKeys.poPayments.list(filters),
    queryFn: async () => {
      let query = dbClient
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
  const dbClient = createDbClient()
  return useQuery({
    queryKey: queryKeys.poPayments.byPo(poId),
    queryFn: async () => {
      const { data, error } = await dbClient
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

// 지급 등록 (API Route → RPC로 초과 지급 방지, 서버에서 company_id 주입)
export function useCreatePoPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      po_id: string
      payment_date: string
      amount: number
      payment_method?: string
      notes?: string
    }) => {
      const res = await fetch('/api/po-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message ?? '지급 등록 실패')
      }
      const { data } = await res.json()
      return { id: data.payment_id as string }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.poPayments.all })
      qc.invalidateQueries({ queryKey: queryKeys.poPayments.byPo(variables.po_id) })
    },
    retry: 0,
  })
}
