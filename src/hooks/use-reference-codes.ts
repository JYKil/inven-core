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
      // DB에서 DISTINCT 처리 (1000행 제한 회피)
      const { data, error } = await supabase.rpc('get_reference_code_types')
      if (error) throw error
      return (data ?? []).map((r: any) => r.code_type)
    },
  })
}

export function useCreateReferenceCode() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<ReferenceCodeInsert, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      // DB RPC로 원자적 생성 (sort_order MAX+1 포함)
      const { data, error } = await supabase.rpc('create_reference_code', {
        p_code_type: input.code_type,
        p_code_data1: input.code_data1,
        p_code_data2: input.code_data2 ?? undefined,
        p_code_data3: input.code_data3 ?? undefined,
        p_code_data4: input.code_data4 ?? undefined,
        p_code_data5: input.code_data5 ?? undefined,
        p_code_data6: input.code_data6 ?? undefined,
        p_code_data7: input.code_data7 ?? undefined,
        p_code_data8: input.code_data8 ?? undefined,
        p_code_data9: input.code_data9 ?? undefined,
        p_sort_order: input.sort_order ?? undefined,
      })
      if (error) throw error
      return data as string // RPC returns uuid
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
      // RPC로 is_active, company_id 등 DB 레벨 보호
      const { error } = await supabase.rpc('update_reference_code', {
        p_id: id,
        p_code_data1: input.code_data1 ?? undefined,
        p_code_data2: input.code_data2 ?? undefined,
        p_code_data3: input.code_data3 ?? undefined,
        p_code_data4: input.code_data4 ?? undefined,
        p_code_data5: input.code_data5 ?? undefined,
        p_code_data6: input.code_data6 ?? undefined,
        p_code_data7: input.code_data7 ?? undefined,
        p_code_data8: input.code_data8 ?? undefined,
        p_code_data9: input.code_data9 ?? undefined,
        p_sort_order: input.sort_order ?? undefined,
      })
      if (error) throw error
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
      // RPC로 소프트 삭제 (DB 레벨 보호)
      const { error } = await supabase.rpc('soft_delete_reference_code', { p_id: id })
      if (error) throw error
    },
    retry: 0,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.referenceCodes.all })
    },
  })
}
