'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.items.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select('*, inventory_summary(total_qty)', { count: 'exact' })
        .order('item_type')
        .order('name')

      if (!filters.includeInactive) query = query.eq('is_active', true)
      if (filters.category) query = query.eq('material_type', filters.category)
      if (filters.itemType) query = query.eq('item_type', filters.itemType)
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        query = query.or(`name.ilike.%${s}%,code.ilike.%${s}%`)
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

export function useItem(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.items.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Item
    },
    enabled: !!id,
  })
}

// 품목 검색 (드롭다운용, 페이지네이션 없이)
export function useItemSearch(search: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['items', 'search', search],
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select('id, code, name, unit, item_type')
        .eq('is_active', true)
        .order('code')
        .limit(50)
      if (search) {
        const s = escapeFilterValue(search)
        query = query.or(`name.ilike.%${s}%,code.ilike.%${s}%`)
      }
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    enabled: search.length > 0 || search === '',
  })
}

export function useCreateItem() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<ItemInsert, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const { data, error } = await supabase
        .from('items')
        .insert({ ...input, company_id: profile.company_id })
        .select()
        .single()
      if (error) throw error
      return data as Item
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}

export function useUpdateItem() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: ItemUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('items')
        .update(input)
        .eq('id', id)
        .select()
        .single()
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
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('items')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}
