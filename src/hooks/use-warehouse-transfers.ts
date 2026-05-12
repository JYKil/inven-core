'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryDb, type QueryOp } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import { escapeFilterValue } from '@/lib/utils'

export type TransferFilters = ListFilters & {
  status?: string
}

// 창고 이동 목록
export function useWarehouseTransfers(filters: TransferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.warehouseTransfers.list(filters),
    queryFn: async () => {
      const ops: QueryOp[] = [
        {
          type: 'select',
          columns: `
          *,
          from_warehouse:warehouses!warehouse_transfers_from_warehouse_id_fkey(id, code, name),
          to_warehouse:warehouses!warehouse_transfers_to_warehouse_id_fkey(id, code, name)
        `,
          options: { count: 'exact' },
        },
        { type: 'order', column: 'created_at', options: { ascending: false } },
      ]

      if (filters.status) ops.push({ type: 'eq', column: 'status', value: filters.status })
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        ops.push({ type: 'ilike', column: 'transfer_number', value: `%${s}%` })
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      ops.push({ type: 'range', from, to: from + pageSize - 1 })

      const { data, error, count } = await queryDb<any[]>('warehouse_transfers', ops)
      if (error) throw error
      return { data: data ?? [], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

// 창고 이동 상세 (라인 포함)
export function useWarehouseTransfer(id: string) {
  return useQuery({
    queryKey: queryKeys.warehouseTransfers.detail(id),
    queryFn: async () => {
      const { data, error } = await queryDb<any>('warehouse_transfers', [
        {
          type: 'select',
          columns: `
          *,
          from_warehouse:warehouses!warehouse_transfers_from_warehouse_id_fkey(id, code, name),
          to_warehouse:warehouses!warehouse_transfers_to_warehouse_id_fkey(id, code, name),
          warehouse_transfer_lines(
            *,
            item:items!warehouse_transfer_lines_item_id_fkey(id, code, name, unit)
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

// 창고 이동 취소 — API Route 호출 (cancel_transfer RPC)
export function useCancelTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await fetch(`/api/warehouse-transfers/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? '이동 취소 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouseTransfers.all })
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
  })
}

// 창고 이동 실행 — API Route 호출 (execute_transfer RPC)
export function useExecuteTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      from_warehouse_id: string
      to_warehouse_id: string
      transfer_date: string
      notes?: string
      lines: { item_id: string; quantity: number }[]
    }) => {
      const res = await fetch('/api/warehouse-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? '창고 이동 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouseTransfers.all })
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
  })
}
