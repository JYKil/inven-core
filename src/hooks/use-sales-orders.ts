'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { getCurrentUser, queryDb, type QueryOp } from '@/lib/api/db-client'
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
  return useQuery({
    queryKey: queryKeys.salesOrders.list(filters),
    queryFn: async () => {
      const ops: QueryOp[] = [
        { type: 'select', columns: '*, customer:customers!sales_orders_customer_id_fkey(id, name)', options: { count: 'exact' } },
        { type: 'order', column: 'created_at', options: { ascending: false } },
      ]

      if (filters.status) ops.push({ type: 'eq', column: 'status', value: filters.status })
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        ops.push({ type: 'or', filter: `order_number.ilike.%${s}%` })
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      ops.push({ type: 'range', from, to: from + pageSize - 1 })

      const { data, error, count } = await queryDb<any[]>('sales_orders', ops)
      if (error) throw error
      return { data: data ?? [], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

// 판매 주문 상세 (라인 포함)
export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.salesOrders.detail(id),
    queryFn: async () => {
      const { data, error } = await queryDb<any>('sales_orders', [
        {
          type: 'select',
          columns: `
          *,
          customer:customers!sales_orders_customer_id_fkey(id, name),
          sales_order_lines(
            *,
            item:items!sales_order_lines_item_id_fkey(id, code, name, unit),
            warehouse:warehouses!sales_order_lines_warehouse_id_fkey(id, code, name)
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

// 판매 주문 생성 (draft → DB query API)
export function useCreateSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      order_number: string
      customer_id: string
      order_date: string
      notes?: string
      lines: { item_id: string; warehouse_id: string; quantity: number; unit_price: number }[]
    }) => {
      const { data: { user } } = await getCurrentUser()
      if (!user) throw new Error('인증이 필요합니다')

      const totalAmount = input.lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)

      // SO 헤더 생성
      const { data: so, error: soErr } = await queryDb<SO>('sales_orders', [
        {
          type: 'insert',
          values: {
          order_number: input.order_number,
          customer_id: input.customer_id,
          order_date: input.order_date,
          notes: input.notes || null,
          total_amount: totalAmount,
          created_by: user.id,
          } satisfies Omit<SOInsert, 'id' | 'company_id' | 'status' | 'created_at' | 'updated_at'>,
        },
        { type: 'select' },
      ], { single: true })
      if (soErr) throw soErr
      if (!so) throw new Error('판매 주문 생성 실패')

      // SO 라인 생성
      const lines = input.lines.map((l) => ({
        sales_order_id: so.id,
        item_id: l.item_id,
        warehouse_id: l.warehouse_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        line_amount: l.quantity * l.unit_price,
      }))
      const { error: linesErr } = await queryDb('sales_order_lines', [
        { type: 'insert', values: lines },
      ])
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, expectedStatus }: { id: string; status: string; expectedStatus: string }) => {
      const { data, error } = await queryDb<SO>('sales_orders', [
        { type: 'update', values: { status } },
        { type: 'eq', column: 'id', value: id },
        { type: 'eq', column: 'status', value: expectedStatus },
        { type: 'select' },
      ], { single: true })
      if (error) throw error
      return data as SO
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.salesOrders.all })
      qc.invalidateQueries({ queryKey: queryKeys.salesOrders.detail(data.id) })
    },
  })
}

// 출고 취소 — API Route 호출 (cancel_shipment RPC)
export function useCancelShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await fetch(`/api/sales-orders/${id}/cancel-shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? '출고 취소 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.salesOrders.all })
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
  })
}

// 출고 실행 — API Route 호출 (execute_shipment RPC)
export function useExecuteShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (salesOrderId: string) => {
      const res = await fetch(`/api/sales-orders/${salesOrderId}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
