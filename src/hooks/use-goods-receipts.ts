'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryDb, type QueryOp } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import { escapeFilterValue } from '@/lib/utils'

export type GrFilters = ListFilters & {
  poId?: string
}

export function useGoodsReceipts(filters: GrFilters = {}) {
  return useQuery({
    queryKey: queryKeys.goodsReceipts.list(filters),
    queryFn: async () => {
      const ops: QueryOp[] = [
        {
          type: 'select',
          columns: `
          *,
          warehouse:warehouses!goods_receipts_warehouse_id_fkey(id, code, name),
          purchase_order:purchase_orders!goods_receipts_po_id_fkey(id, po_number)
        `,
          options: { count: 'exact' },
        },
        { type: 'order', column: 'created_at', options: { ascending: false } },
      ]

      if (filters.poId) ops.push({ type: 'eq', column: 'po_id', value: filters.poId })
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        ops.push({ type: 'ilike', column: 'receipt_number', value: `%${s}%` })
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      ops.push({ type: 'range', from, to: from + pageSize - 1 })

      const { data, error, count } = await queryDb<any[]>('goods_receipts', ops)
      if (error) throw error
      return { data: data ?? [], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

// 입고 상세 (라인 포함)
export function useGoodsReceipt(id: string) {
  return useQuery({
    queryKey: queryKeys.goodsReceipts.detail(id),
    queryFn: async () => {
      const { data, error } = await queryDb<any>('goods_receipts', [
        {
          type: 'select',
          columns: `
          *,
          warehouse:warehouses!goods_receipts_warehouse_id_fkey(id, code, name),
          purchase_order:purchase_orders!goods_receipts_po_id_fkey(id, po_number),
          goods_receipt_lines(
            *,
            item:items!goods_receipt_lines_item_id_fkey(id, code, name, unit)
          )
        `,
        },
        { type: 'eq', column: 'id', value: id },
      ], { single: true })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// PO별 입고 이력
export function useGoodsReceiptsByPo(poId: string) {
  return useQuery({
    queryKey: queryKeys.goodsReceipts.byPo(poId),
    queryFn: async () => {
      const { data, error } = await queryDb<any[]>('goods_receipts', [
        {
          type: 'select',
          columns: `
          *,
          warehouse:warehouses!goods_receipts_warehouse_id_fkey(id, code, name),
          goods_receipt_lines(
            *,
            item:items!goods_receipt_lines_item_id_fkey(id, code, name, unit)
          )
        `,
        },
        { type: 'eq', column: 'po_id', value: poId },
        { type: 'order', column: 'receipt_date', options: { ascending: false } },
      ])
      if (error) throw error
      return data ?? []
    },
    enabled: !!poId,
  })
}

// 입고 취소 — API Route 호출 (cancel_goods_receipt RPC)
export function useCancelGoodsReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await fetch(`/api/goods-receipts/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? '입고 취소 실패')
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

// 입고 실행 — API Route 호출 (복잡한 트랜잭션)
export function useExecuteGoodsReceipt() {
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
      const res = await fetch('/api/goods-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
