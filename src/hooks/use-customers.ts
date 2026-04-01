'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/database'
import { escapeFilterValue } from '@/lib/utils'

type Customer = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']

export type CustomerFilters = ListFilters & {
  includeInactive?: boolean
}

export function useCustomers(filters: CustomerFilters = {}) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order('name')

      if (!filters.includeInactive) query = query.eq('is_active', true)
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        query = query.or(`name.ilike.%${s}%,business_number.ilike.%${s}%`)
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as Customer[], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

export function useCustomer(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Customer
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<CustomerInsert, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const { data, error } = await supabase
        .from('customers')
        .insert({ ...input, company_id: profile.company_id })
        .select()
        .single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.all })
    },
  })
}

export function useUpdateCustomer() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: CustomerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.all })
      qc.setQueryData(queryKeys.customers.detail(data.id), data)
    },
  })
}

export function useDeleteCustomer() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.all })
    },
  })
}
