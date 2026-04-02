'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/database'
import { escapeFilterValue } from '@/lib/utils'

type PO = Database['public']['Tables']['purchase_orders']['Row']

export type PoFilters = ListFilters & {
  status?: string
}

export function usePurchaseOrders(filters: PoFilters = {}) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.purchaseOrders.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select('*, vendor:vendors!purchase_orders_vendor_id_fkey(id, name)', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        query = query.or(`po_number.ilike.%${s}%`)
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

export function usePurchaseOrder(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendors!purchase_orders_vendor_id_fkey(id, name),
          purchase_order_lines(
            *,
            item:items!purchase_order_lines_item_id_fkey(id, code, name, unit)
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      po_number: string
      vendor_id: string
      order_date: string
      expected_date?: string
      notes?: string
      lines: {
        line_type: 'inventory' | 'expense'
        item_id?: string
        description?: string
        ordered_qty?: number
        unit_price?: number
        line_amount?: number
      }[]
    }) => {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message ?? '등록 실패')
      }
      const { data } = await res.json()
      return { id: data.po_id } as unknown as PO
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
    },
  })
}

export function useUpdatePurchaseOrderStatus() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, expectedStatus }: { id: string; status: string; expectedStatus: string }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({ status })
        .eq('id', id)
        .eq('status', expectedStatus)
        .select()
        .single()
      if (error) throw error
      return data as PO
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      qc.setQueryData(queryKeys.purchaseOrders.detail(data.id), undefined)
    },
  })
}
