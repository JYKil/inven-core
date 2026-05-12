'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryDb, type QueryOp } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { AssemblyOrderCreate } from '@/lib/validations/assembly'
import { escapeFilterValue } from '@/lib/utils'

export type AssemblyFilters = ListFilters & {
  status?: string
}

// 조립 지시 목록
export function useAssemblyOrders(filters: AssemblyFilters = {}) {
  return useQuery({
    queryKey: queryKeys.assemblyOrders.list(filters),
    queryFn: async () => {
      const ops: QueryOp[] = [
        {
          type: 'select',
          columns: `
          *,
          product_item:items!assembly_orders_product_item_id_fkey(id, code, name, unit),
          warehouse:warehouses!assembly_orders_warehouse_id_fkey(id, code, name)
        `,
          options: { count: 'exact' },
        },
        { type: 'order', column: 'created_at', options: { ascending: false } },
      ]

      if (filters.status) ops.push({ type: 'eq', column: 'status', value: filters.status })
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        ops.push({ type: 'ilike', column: 'order_number', value: `%${s}%` })
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      ops.push({ type: 'range', from, to: from + pageSize - 1 })

      const { data, error, count } = await queryDb<any[]>('assembly_orders', ops)
      if (error) throw error
      return { data: data ?? [], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

// 조립 지시 상세
export function useAssemblyOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.assemblyOrders.detail(id),
    queryFn: async () => {
      const { data, error } = await queryDb<any>('assembly_orders', [
        {
          type: 'select',
          columns: `
          *,
          product_item:items!assembly_orders_product_item_id_fkey(id, code, name, unit),
          warehouse:warehouses!assembly_orders_warehouse_id_fkey(id, code, name),
          bom_header:bom_headers!assembly_orders_bom_header_id_fkey(id, version),
          assembly_order_lines(
            *,
            material_item:items!assembly_order_lines_material_item_id_fkey(id, code, name, unit)
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

// 재료 가용성 확인 — BOM 라인 + 현재고 비교
export function useMaterialAvailability(
  bomHeaderId: string,
  warehouseId: string,
  quantity: number,
) {
  return useQuery({
    queryKey: queryKeys.assemblyOrders.materialAvailability(bomHeaderId, warehouseId, quantity),
    queryFn: async () => {
      // BOM 라인 조회
      const { data: bomLines, error: bomErr } = await queryDb<any[]>('bom_lines', [
        {
          type: 'select',
          columns: `
          material_item_id,
          quantity,
          material_item:items!bom_lines_material_item_id_fkey(id, code, name, unit)
        `,
        },
        { type: 'eq', column: 'bom_header_id', value: bomHeaderId },
        { type: 'order', column: 'sort_order' },
      ])
      if (bomErr) throw bomErr

      // 각 재료의 현재고 조회
      const materialIds = (bomLines ?? []).map((l: any) => l.material_item_id)
      const { data: stockData, error: stockErr } = await queryDb<any[]>('inventory_summary', [
        { type: 'select', columns: 'item_id, total_qty' },
        { type: 'eq', column: 'warehouse_id', value: warehouseId },
        { type: 'in', column: 'item_id', values: materialIds },
      ])
      if (stockErr) throw stockErr

      const stockMap = new Map(
        (stockData ?? []).map((s: any) => [s.item_id, Number(s.total_qty)])
      )

      // FIFO 순 로트 단가 조회 (예상 원가 미리보기용)
      const { data: lotsData, error: lotsErr } = await queryDb<any[]>('inventory_lots', [
        { type: 'select', columns: 'item_id, remaining_qty, unit_cost' },
        { type: 'eq', column: 'warehouse_id', value: warehouseId },
        { type: 'in', column: 'item_id', values: materialIds },
        { type: 'gt', column: 'remaining_qty', value: 0 },
        { type: 'order', column: 'lot_date', options: { ascending: true } },
      ])
      if (lotsErr) throw lotsErr

      // 품목별 로트 그룹핑
      const lotsMap = new Map<string, { remaining_qty: number; unit_cost: number }[]>()
      for (const lot of lotsData ?? []) {
        const list = lotsMap.get(lot.item_id) ?? []
        list.push({ remaining_qty: Number(lot.remaining_qty), unit_cost: Number(lot.unit_cost) })
        lotsMap.set(lot.item_id, list)
      }

      // FIFO 원가 시뮬레이션
      const calcFifoCost = (itemId: string, qty: number): number => {
        const lots = lotsMap.get(itemId) ?? []
        let remaining = qty
        let cost = 0
        for (const lot of lots) {
          if (remaining <= 0) break
          const consume = Math.min(remaining, lot.remaining_qty)
          cost += consume * lot.unit_cost
          remaining -= consume
        }
        return cost
      }

      let estimatedTotalCost = 0
      const materials = (bomLines ?? []).map((line: any) => {
        const requiredQty = Number(line.quantity) * quantity
        const currentStock = Number(stockMap.get(line.material_item_id) ?? 0)
        const shortage = Math.max(0, requiredQty - currentStock)
        const estimatedCost = calcFifoCost(line.material_item_id, requiredQty)
        estimatedTotalCost += estimatedCost
        return {
          materialItemId: line.material_item_id,
          materialItem: line.material_item as { id: string; code: string; name: string; unit: string },
          bomQty: Number(line.quantity),
          requiredQty,
          currentStock,
          isAvailable: currentStock >= requiredQty,
          shortage,
          estimatedCost,
        }
      })

      return {
        materials,
        estimatedTotalCost,
        estimatedUnitCost: quantity > 0 ? estimatedTotalCost / quantity : 0,
      }
    },
    enabled: !!bomHeaderId && !!warehouseId && quantity > 0,
  })
}

// 조립 가능 품목 (item_type='assembly' && 활성 BOM 있음)
export function useAssemblyItems() {
  return useQuery({
    queryKey: queryKeys.assemblyOrders.items(),
    queryFn: async () => {
      const { data, error } = await queryDb<any[]>('items', [
        {
          type: 'select',
          columns: `
          id, code, name, unit,
          bom_headers!bom_headers_product_item_id_fkey(id, version, is_active)
        `,
        },
        { type: 'eq', column: 'item_type', value: 'assembly' },
        { type: 'eq', column: 'is_active', value: true },
        { type: 'order', column: 'code' },
      ])
      if (error) throw error
      // 활성 BOM이 있는 품목만 필터
      return (data ?? []).filter((item: any) =>
        item.bom_headers?.some((bom: any) => bom.is_active)
      )
    },
  })
}

// 조립 실행 — API Route 호출
// 조립 취소 — API Route 호출 (cancel_assembly RPC)
export function useCancelAssembly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await fetch(`/api/assembly-orders/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? '조립 취소 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assemblyOrders.all })
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
  })
}

export function useExecuteAssembly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AssemblyOrderCreate) => {
      const res = await fetch('/api/assembly-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? '조립 실행 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assemblyOrders.all })
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
  })
}
