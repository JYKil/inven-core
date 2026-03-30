'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/database'

type Partner = Database['public']['Tables']['partners']['Row']
type PartnerInsert = Database['public']['Tables']['partners']['Insert']
type PartnerUpdate = Database['public']['Tables']['partners']['Update']

export type PartnerFilters = ListFilters & {
  partnerType?: string
  includeInactive?: boolean
}

export function usePartners(filters: PartnerFilters = {}) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.partners.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('partners')
        .select('*', { count: 'exact' })
        .order('name')

      if (!filters.includeInactive) query = query.eq('is_active', true)
      if (filters.partnerType) query = query.eq('partner_type', filters.partnerType)
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,business_number.ilike.%${filters.search}%`)
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as Partner[], count: count ?? 0, page, pageSize }
    },
  })
}

export function usePartner(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.partners.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Partner
    },
    enabled: !!id,
  })
}

export function useCreatePartner() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<PartnerInsert, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      // company_id는 RLS가 처리 — JWT의 custom claim에서 자동 주입되지 않으므로 profile에서 조회
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const { data, error } = await supabase
        .from('partners')
        .insert({ ...input, company_id: profile.company_id })
        .select()
        .single()
      if (error) throw error
      return data as Partner
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.partners.all })
    },
  })
}

export function useUpdatePartner() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: PartnerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('partners')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Partner
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.partners.all })
      qc.setQueryData(queryKeys.partners.detail(data.id), data)
    },
  })
}

export function useDeletePartner() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // 소프트 삭제
      const { error } = await supabase
        .from('partners')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.partners.all })
    },
  })
}
