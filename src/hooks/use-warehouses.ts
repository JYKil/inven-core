'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createDbClient } from '@/lib/api/db-client'
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
  const dbClient = createDbClient()
  return useQuery({
    queryKey: queryKeys.warehouses.list(filters),
    queryFn: async () => {
      let query = dbClient
        .from('warehouses')
        .select('*', { count: 'exact' })
        .order('name')

      if (!filters.includeInactive) query = query.eq('is_active', true)
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        query = query.or(`name.ilike.%${s}%,address.ilike.%${s}%`)
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as Warehouse[], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

export function useWarehouse(id: string) {
  const dbClient = createDbClient()
  return useQuery({
    queryKey: queryKeys.warehouses.detail(id),
    queryFn: async () => {
      const { data, error } = await dbClient
        .from('warehouses')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Warehouse
    },
    enabled: !!id,
  })
}

export function useCreateWarehouse() {
  const dbClient = createDbClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<WarehouseInsert, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await dbClient.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await dbClient
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const { data, error } = await dbClient
        .from('warehouses')
        .insert({ ...input, company_id: profile.company_id })
        .select()
        .single()
      if (error) throw error
      return data as Warehouse
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouses.all })
    },
  })
}

export function useUpdateWarehouse() {
  const dbClient = createDbClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: WarehouseUpdate & { id: string }) => {
      const { data, error } = await dbClient
        .from('warehouses')
        .update(input)
        .eq('id', id)
        .select()
        .single()
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
  const dbClient = createDbClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await dbClient
        .from('warehouses')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouses.all })
    },
  })
}
