'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'

export type GrFilters = ListFilters & {
  poId?: string
}

export function useGoodsReceipts(filters: GrFilters = {}) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.goodsReceipts.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('goods_receipts')
        .select(`
          *,
          warehouse:warehouses!goods_receipts_warehouse_id_fkey(id, code, name),
          purchase_order:purchase_orders!goods_receipts_po_id_fkey(id, po_number)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filters.poId) query = query.eq('po_id', filters.poId)
      if (filters.search) {
        query = query.ilike('receipt_number', `%${filters.search}%`)
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

// PO별 입고 이력
export function useGoodsReceiptsByPo(poId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.goodsReceipts.byPo(poId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goods_receipts')
        .select(`
          *,
          warehouse:warehouses!goods_receipts_warehouse_id_fkey(id, code, name),
          goods_receipt_lines(
            *,
            item:items!goods_receipt_lines_item_id_fkey(id, code, name, unit)
          )
        `)
        .eq('po_id', poId)
        .order('receipt_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!poId,
  })
}

// 입고 실행 — API Route 호출 (복잡한 트랜잭션)
export function useExecuteGoodsReceipt() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      receipt_number: string
      po_id?: string
      warehouse_id: string
      receipt_date: string
      notes?: string
      lines: { po_line_id?: string; item_id: string; quantity: number; unit_price: number }[]
    }) => {
      // API Route 대신 RPC 직접 호출
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('인증이 필요합니다')

      const res = await fetch('/api/goods-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? '입고 처리 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goodsReceipts.all })
      qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
  })
}
