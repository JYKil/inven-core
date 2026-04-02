'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/database'
import { escapeFilterValue } from '@/lib/utils'

type PO = Database['public']['Tables']['purchase_orders']['Row']
type POInsert = Database['public']['Tables']['purchase_orders']['Insert']

export type PoFilters = ListFilters & {
  status?: string
}

export function usePurchaseOrders(filters: PoFilters = {}) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.purchaseOrders.list(filters),
    queryFn: async () => {
      // PO 헤더 + 라인 + 품목을 조인하여 플랫 테이블용 데이터 조회
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendors!purchase_orders_vendor_id_fkey(id, name),
          purchase_order_lines(
            *,
            item:items!purchase_order_lines_item_id_fkey(id, code, name, unit)
          )
        `, { count: 'exact' })
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
  const supabase = createClient()
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      // 재고: qty * price, 비용: line_amount 직접
      const totalAmount = input.lines.reduce((sum, l) => {
        if (l.line_type === 'expense') return sum + (l.line_amount ?? 0)
        return sum + (l.ordered_qty ?? 0) * (l.unit_price ?? 0)
      }, 0)

      // PO 헤더 생성
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          company_id: profile.company_id,
          po_number: input.po_number,
          vendor_id: input.vendor_id,
          order_date: input.order_date,
          expected_date: input.expected_date || null,
          notes: input.notes || null,
          total_amount: totalAmount,
          created_by: user.id,
        } satisfies Omit<POInsert, 'id' | 'status' | 'created_at' | 'updated_at'>)
        .select()
        .single()
      if (poErr) throw poErr

      // PO 라인 생성
      const lines = input.lines.map((l) => {
        if (l.line_type === 'expense') {
          return {
            po_id: po.id,
            line_type: 'expense' as const,
            item_id: null,
            description: l.description ?? '',
            ordered_qty: 0,
            unit_price: 0,
            line_amount: l.line_amount ?? 0,
          }
        }
        return {
          po_id: po.id,
          line_type: 'inventory' as const,
          item_id: l.item_id!,
          description: null,
          ordered_qty: l.ordered_qty ?? 0,
          unit_price: l.unit_price ?? 0,
          line_amount: (l.ordered_qty ?? 0) * (l.unit_price ?? 0),
        }
      })
      const { error: linesErr } = await supabase
        .from('purchase_order_lines')
        .insert(lines)
      if (linesErr) throw linesErr

      return po as PO
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
