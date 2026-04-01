'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/database'
import { escapeFilterValue } from '@/lib/utils'

type ReferenceCode = Database['public']['Tables']['reference_codes']['Row']
type ReferenceCodeInsert = Database['public']['Tables']['reference_codes']['Insert']
type ReferenceCodeUpdate = Database['public']['Tables']['reference_codes']['Update']

export type ReferenceCodeFilters = ListFilters & {
  codeType?: string
}

export function useReferenceCodes(filters: ReferenceCodeFilters = {}) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.referenceCodes.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('reference_codes')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('code_type')
        .order('sort_order')

      if (filters.codeType) query = query.eq('code_type', filters.codeType)
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        query = query.or(`code_data1.ilike.%${s}%,code_type.ilike.%${s}%`)
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as ReferenceCode[], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

export function useReferenceCodeTypes() {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.referenceCodes.types(),
    queryFn: async () => {
      // is_active=true 레코드의 고유 code_type 목록
      const { data, error } = await supabase
        .from('reference_codes')
        .select('code_type')
        .eq('is_active', true)
        .order('code_type')

      if (error) throw error
      // DISTINCT 대신 클라이언트에서 중복 제거
      const types = [...new Set((data ?? []).map((r) => r.code_type))]
      return types
    },
  })
}

export function useCreateReferenceCode() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<ReferenceCodeInsert, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      // sort_order 자동 증가: 해당 타입의 MAX(sort_order) + 1
      let sortOrder = input.sort_order
      if (sortOrder == null) {
        const { data: maxRow } = await supabase
          .from('reference_codes')
          .select('sort_order')
          .eq('company_id', profile.company_id)
          .eq('code_type', input.code_type!)
          .eq('is_active', true)
          .order('sort_order', { ascending: false })
          .limit(1)
          .single()
        sortOrder = (maxRow?.sort_order ?? 0) + 1
      }

      const { data, error } = await supabase
        .from('reference_codes')
        .insert({ ...input, company_id: profile.company_id, sort_order: sortOrder })
        .select()
        .single()
      if (error) throw error
      return data as ReferenceCode
    },
    retry: 0,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.referenceCodes.all })
    },
  })
}

export function useUpdateReferenceCode() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: ReferenceCodeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('reference_codes')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as ReferenceCode
    },
    retry: 0,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.referenceCodes.all })
    },
  })
}

export function useDeleteReferenceCode() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // 소프트 삭제
      const { error } = await supabase
        .from('reference_codes')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    retry: 0,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.referenceCodes.all })
    },
  })
}
