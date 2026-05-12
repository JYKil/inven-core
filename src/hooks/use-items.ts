'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryDb, type QueryOp } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/database'
import { escapeFilterValue } from '@/lib/utils'

type Item = Database['public']['Tables']['items']['Row']
type ItemInsert = Database['public']['Tables']['items']['Insert']
type ItemUpdate = Database['public']['Tables']['items']['Update']

export type ItemFilters = ListFilters & {
  category?: string
  itemType?: string
  includeInactive?: boolean
}

// 품목 + 현재고 조회
export function useItems(filters: ItemFilters = {}) {
  return useQuery({
    queryKey: queryKeys.items.list(filters),
    queryFn: async () => {
      const ops: QueryOp[] = [
        { type: 'select', columns: '*, inventory_summary(total_qty)', options: { count: 'exact' } },
        { type: 'order', column: 'item_type' },
        { type: 'order', column: 'name' },
      ]

      if (!filters.includeInactive) ops.push({ type: 'eq', column: 'is_active', value: true })
      if (filters.category) ops.push({ type: 'eq', column: 'material_type', value: filters.category })
      if (filters.itemType) ops.push({ type: 'eq', column: 'item_type', value: filters.itemType })
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        ops.push({ type: 'or', filter: `name.ilike.%${s}%,code.ilike.%${s}%` })
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      ops.push({ type: 'range', from, to: from + pageSize - 1 })

      const { data, error, count } = await queryDb<Item[]>('items', ops)
      if (error) throw error
      return { data: data ?? [], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

export function useItem(id: string) {
  return useQuery({
    queryKey: queryKeys.items.detail(id),
    queryFn: async () => {
      const { data, error } = await queryDb<Item>('items', [
        { type: 'select', columns: '*' },
        { type: 'eq', column: 'id', value: id },
      ], { single: true })
      if (error) throw error
      return data as Item
    },
    enabled: !!id,
  })
}

// 품목 검색 (드롭다운용, 페이지네이션 없이)
export function useItemSearch(search: string) {
  return useQuery({
    queryKey: ['items', 'search', search],
    queryFn: async () => {
      const ops: QueryOp[] = [
        { type: 'select', columns: 'id, code, name, unit, item_type' },
        { type: 'eq', column: 'is_active', value: true },
        { type: 'order', column: 'code' },
        { type: 'limit', count: 50 },
      ]
      if (search) {
        const s = escapeFilterValue(search)
        ops.push({ type: 'or', filter: `name.ilike.%${s}%,code.ilike.%${s}%` })
      }
      const { data, error } = await queryDb<Item[]>('items', ops)
      if (error) throw error
      return data ?? []
    },
    enabled: search.length > 0 || search === '',
  })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<ItemInsert, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await queryDb<Item>('items', [
        { type: 'insert', values: input },
        { type: 'select' },
      ], { single: true })
      if (error) throw error
      return data as Item
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: ItemUpdate & { id: string }) => {
      const { data, error } = await queryDb<Item>('items', [
        { type: 'update', values: input },
        { type: 'eq', column: 'id', value: id },
        { type: 'select' },
      ], { single: true })
      if (error) throw error
      return data as Item
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.items.all })
      qc.setQueryData(queryKeys.items.detail(data.id), data)
    },
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await queryDb('items', [
        { type: 'update', values: { is_active: false } },
        { type: 'eq', column: 'id', value: id },
      ])
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}
