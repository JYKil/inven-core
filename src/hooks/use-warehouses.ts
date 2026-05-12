'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryDb, type QueryOp } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/database'
import { escapeFilterValue } from '@/lib/utils'

type Warehouse = Database['public']['Tables']['warehouses']['Row']
type WarehouseInsert = Database['public']['Tables']['warehouses']['Insert']
type WarehouseUpdate = Database['public']['Tables']['warehouses']['Update']

export type WarehouseFilters = ListFilters & {
  includeInactive?: boolean
}

export function useWarehouses(filters: WarehouseFilters = {}) {
  return useQuery({
    queryKey: queryKeys.warehouses.list(filters),
    queryFn: async () => {
      const ops: QueryOp[] = [
        { type: 'select', columns: '*', options: { count: 'exact' } },
        { type: 'order', column: 'name' },
      ]

      if (!filters.includeInactive) ops.push({ type: 'eq', column: 'is_active', value: true })
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        ops.push({ type: 'or', filter: `name.ilike.%${s}%,address.ilike.%${s}%` })
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      ops.push({ type: 'range', from, to: from + pageSize - 1 })

      const { data, error, count } = await queryDb<Warehouse[]>('warehouses', ops)
      if (error) throw error
      return { data: data as Warehouse[], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: queryKeys.warehouses.detail(id),
    queryFn: async () => {
      const { data, error } = await queryDb<Warehouse>('warehouses', [
        { type: 'select', columns: '*' },
        { type: 'eq', column: 'id', value: id },
      ], { single: true })
      if (error) throw error
      return data as Warehouse
    },
    enabled: !!id,
  })
}

export function useCreateWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<WarehouseInsert, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await queryDb<Warehouse>('warehouses', [
        { type: 'insert', values: input },
        { type: 'select' },
      ], { single: true })
      if (error) throw error
      return data as Warehouse
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouses.all })
    },
  })
}

export function useUpdateWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: WarehouseUpdate & { id: string }) => {
      const { data, error } = await queryDb<Warehouse>('warehouses', [
        { type: 'update', values: input },
        { type: 'eq', column: 'id', value: id },
        { type: 'select' },
      ], { single: true })
      if (error) throw error
      return data as Warehouse
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouses.all })
      qc.setQueryData(queryKeys.warehouses.detail(data.id), data)
    },
  })
}

export function useDeleteWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await queryDb('warehouses', [
        { type: 'update', values: { is_active: false } },
        { type: 'eq', column: 'id', value: id },
      ])
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouses.all })
    },
  })
}
