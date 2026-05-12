'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { createDbClient } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'

export type InventoryFilters = ListFilters & {
  warehouseId?: string
  view?: 'item' | 'warehouse'
}

// 재고 현황 (inventory_summary + items JOIN)
export function useInventorySummary(filters: InventoryFilters = {}) {
  const dbClient = createDbClient()
  return useQuery({
    queryKey: queryKeys.inventory.summary(filters),
    queryFn: async () => {
      let query = dbClient
        .from('inventory_summary')
        .select(`
          *,
          item:items!inventory_summary_item_id_fkey(id, code, name, unit, min_stock_qty, item_type),
          warehouse:warehouses!inventory_summary_warehouse_id_fkey(id, code, name)
        `, { count: 'exact' })
        .gt('total_qty', 0)
        .order('item_id')

      if (filters.warehouseId) query = query.eq('warehouse_id', filters.warehouseId)

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 50
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error, count } = await query
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
  const dbClient = createDbClient()
  return useQuery({
    queryKey: queryKeys.inventory.lots(itemId, warehouseId),
    queryFn: async () => {
      let query = dbClient
        .from('inventory_lots')
        .select(`
          *,
          warehouse:warehouses!inventory_lots_warehouse_id_fkey(id, code, name)
        `)
        .eq('item_id', itemId)
        .gt('remaining_qty', 0)
        .order('lot_date', { ascending: true })

      if (warehouseId) query = query.eq('warehouse_id', warehouseId)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    enabled: !!itemId,
  })
}
