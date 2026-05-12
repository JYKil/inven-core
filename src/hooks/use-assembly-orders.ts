'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createDbClient } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { AssemblyOrderCreate } from '@/lib/validations/assembly'
import { escapeFilterValue } from '@/lib/utils'

export type AssemblyFilters = ListFilters & {
  status?: string
}

// 조립 지시 목록
export function useAssemblyOrders(filters: AssemblyFilters = {}) {
  const dbClient = createDbClient()
  return useQuery({
    queryKey: queryKeys.assemblyOrders.list(filters),
    queryFn: async () => {
      let query = dbClient
        .from('assembly_orders')
        .select(`
          *,
          product_item:items!assembly_orders_product_item_id_fkey(id, code, name, unit),
          warehouse:warehouses!assembly_orders_warehouse_id_fkey(id, code, name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        query = query.ilike('order_number', `%${s}%`)
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

// 조립 지시 상세
export function useAssemblyOrder(id: string) {
  const dbClient = createDbClient()
  return useQuery({
    queryKey: queryKeys.assemblyOrders.detail(id),
    queryFn: async () => {
      const { data, error } = await dbClient
        .from('assembly_orders')
        .select(`
          *,
          product_item:items!assembly_orders_product_item_id_fkey(id, code, name, unit),
          warehouse:warehouses!assembly_orders_warehouse_id_fkey(id, code, name),
          bom_header:bom_headers!assembly_orders_bom_header_id_fkey(id, version),
          assembly_order_lines(
            *,
            material_item:items!assembly_order_lines_material_item_id_fkey(id, code, name, unit)
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

// 재료 가용성 확인 — BOM 라인 + 현재고 비교
export function useMaterialAvailability(
  bomHeaderId: string,
  warehouseId: string,
  quantity: number,
) {
  const dbClient = createDbClient()
  return useQuery({
    queryKey: queryKeys.assemblyOrders.materialAvailability(bomHeaderId, warehouseId, quantity),
    queryFn: async () => {
      // BOM 라인 조회
      const { data: bomLines, error: bomErr } = await dbClient
        .from('bom_lines')
        .select(`
          material_item_id,
          quantity,
          material_item:items!bom_lines_material_item_id_fkey(id, code, name, unit)
        `)
        .eq('bom_header_id', bomHeaderId)
        .order('sort_order')
      if (bomErr) throw bomErr

      // 각 재료의 현재고 조회
      const materialIds = (bomLines ?? []).map((l: any) => l.material_item_id)
      const { data: stockData, error: stockErr } = await dbClient
        .from('inventory_summary')
        .select('item_id, total_qty')
        .eq('warehouse_id', warehouseId)
        .in('item_id', materialIds)
      if (stockErr) throw stockErr

      const stockMap = new Map(
        (stockData ?? []).map((s: any) => [s.item_id, Number(s.total_qty)])
      )

      // FIFO 순 로트 단가 조회 (예상 원가 미리보기용)
      const { data: lotsData, error: lotsErr } = await dbClient
        .from('inventory_lots')
        .select('item_id, remaining_qty, unit_cost')
        .eq('warehouse_id', warehouseId)
        .in('item_id', materialIds)
        .gt('remaining_qty', 0)
        .order('lot_date', { ascending: true })
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
  const dbClient = createDbClient()
  return useQuery({
    queryKey: queryKeys.assemblyOrders.items(),
    queryFn: async () => {
      const { data, error } = await dbClient
        .from('items')
        .select(`
          id, code, name, unit,
          bom_headers!bom_headers_product_item_id_fkey(id, version, is_active)
        `)
        .eq('item_type', 'assembly')
        .eq('is_active', true)
        .order('code')
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
  const dbClient = createDbClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data: { session } } = await dbClient.auth.getSession()
      if (!session) throw new Error('인증이 필요합니다')

      const res = await fetch(`/api/assembly-orders/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
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
  const dbClient = createDbClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AssemblyOrderCreate) => {
      const { data: { session } } = await dbClient.auth.getSession()
      if (!session) throw new Error('인증이 필요합니다')

      const res = await fetch('/api/assembly-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
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
