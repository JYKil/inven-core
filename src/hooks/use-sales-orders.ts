'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/database'
import { escapeFilterValue } from '@/lib/utils'

type SO = Database['public']['Tables']['sales_orders']['Row']
type SOInsert = Database['public']['Tables']['sales_orders']['Insert']

export type SoFilters = ListFilters & {
  status?: string
}

// 판매 주문 목록
export function useSalesOrders(filters: SoFilters = {}) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.salesOrders.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('sales_orders')
        .select('*, partner:partners!sales_orders_partner_id_fkey(id, name)', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        query = query.or(`order_number.ilike.%${s}%`)
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data ?? [], count: count ?? 0, page, pageSize }
    },
  })
}

// 판매 주문 상세 (라인 포함)
export function useSalesOrder(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.salesOrders.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          partner:partners!sales_orders_partner_id_fkey(id, name),
          sales_order_lines(
            *,
            item:items!sales_order_lines_item_id_fkey(id, code, name, unit),
            warehouse:warehouses!sales_order_lines_warehouse_id_fkey(id, code, name)
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

// 판매 주문 생성 (draft → Supabase 직접)
export function useCreateSalesOrder() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      order_number: string
      partner_id: string
      order_date: string
      notes?: string
      lines: { item_id: string; warehouse_id: string; quantity: number; unit_price: number }[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const totalAmount = input.lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)

      // SO 헤더 생성
      const { data: so, error: soErr } = await supabase
        .from('sales_orders')
        .insert({
          company_id: profile.company_id,
          order_number: input.order_number,
          partner_id: input.partner_id,
          order_date: input.order_date,
          notes: input.notes || null,
          total_amount: totalAmount,
          created_by: user.id,
        } satisfies Omit<SOInsert, 'id' | 'status' | 'created_at' | 'updated_at'>)
        .select()
        .single()
      if (soErr) throw soErr

      // SO 라인 생성
      const lines = input.lines.map((l) => ({
        sales_order_id: so.id,
        item_id: l.item_id,
        warehouse_id: l.warehouse_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        line_amount: l.quantity * l.unit_price,
      }))
      const { error: linesErr } = await supabase
        .from('sales_order_lines')
        .insert(lines)
      if (linesErr) throw linesErr

      return so as SO
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.salesOrders.all })
    },
  })
}

// 판매 주문 상태 변경 (draft → confirmed, confirmed → cancelled 등)
export function useUpdateSalesOrderStatus() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, expectedStatus }: { id: string; status: string; expectedStatus: string }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update({ status })
        .eq('id', id)
        .eq('status', expectedStatus)
        .select()
        .single()
      if (error) throw error
      return data as SO
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.salesOrders.all })
      qc.invalidateQueries({ queryKey: queryKeys.salesOrders.detail(data.id) })
    },
  })
}

// 출고 실행 — API Route 호출 (execute_shipment RPC)
export function useExecuteShipment() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (salesOrderId: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('인증이 필요합니다')

      const res = await fetch(`/api/sales-orders/${salesOrderId}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? '출고 실행 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.salesOrders.all })
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
  })
}
