'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryDb, type QueryOp } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'

export type InventoryFilters = ListFilters & {
  warehouseId?: string
  view?: 'item' | 'warehouse'
}

// 재고 현황 (inventory_summary + items JOIN)
export function useInventorySummary(filters: InventoryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.inventory.summary(filters),
    queryFn: async () => {
      const ops: QueryOp[] = [
        {
          type: 'select',
          columns: `
          *,
          item:items!inventory_summary_item_id_fkey(id, code, name, unit, min_stock_qty, item_type),
          warehouse:warehouses!inventory_summary_warehouse_id_fkey(id, code, name)
        `,
          options: { count: 'exact' },
        },
        { type: 'gt', column: 'total_qty', value: 0 },
        { type: 'order', column: 'item_id' },
      ]

      if (filters.warehouseId) ops.push({ type: 'eq', column: 'warehouse_id', value: filters.warehouseId })

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 50
      const from = (page - 1) * pageSize
      ops.push({ type: 'range', from, to: from + pageSize - 1 })

      const { data, error, count } = await queryDb<any[]>('inventory_summary', ops)
      if (error) throw error

      // joined table 필터는 서버 API에서 직접 지원하지 않아 클라이언트에서 보조 필터링
      let filtered = data ?? []
      if (filters.search) {
        const term = filters.search.toLowerCase()
        filtered = filtered.filter((row: any) => {
          const item = row.item
          if (!item) return false
          return item.code?.toLowerCase().includes(term) || item.name?.toLowerCase().includes(term)
        })
      }

      return { data: filtered, count: filters.search ? filtered.length : (count ?? 0), page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

// 특정 품목의 로트 상세
export function useInventoryLots(itemId: string, warehouseId?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.lots(itemId, warehouseId),
    queryFn: async () => {
      const ops: QueryOp[] = [
        {
          type: 'select',
          columns: `
          *,
          warehouse:warehouses!inventory_lots_warehouse_id_fkey(id, code, name)
        `,
        },
        { type: 'eq', column: 'item_id', value: itemId },
        { type: 'gt', column: 'remaining_qty', value: 0 },
        { type: 'order', column: 'lot_date', options: { ascending: true } },
      ]

      if (warehouseId) ops.push({ type: 'eq', column: 'warehouse_id', value: warehouseId })

      const { data, error } = await queryDb<any[]>('inventory_lots', ops)
      if (error) throw error
      return data ?? []
    },
    enabled: !!itemId,
  })
}
