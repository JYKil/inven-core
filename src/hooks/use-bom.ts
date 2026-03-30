'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import type { BomLineInput } from '@/lib/validations/bom'

// 품목의 BOM 목록 조회
export function useBomByItem(itemId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.bom.byItem(itemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bom_headers')
        .select(`
          *,
          bom_lines(
            *,
            material_item:items!bom_lines_material_item_id_fkey(id, code, name, unit)
          )
        `)
        .eq('product_item_id', itemId)
        .order('version', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!itemId,
  })
}

export function useBomDetail(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.bom.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bom_headers')
        .select(`
          *,
          product_item:items!bom_headers_product_item_id_fkey(id, code, name, unit),
          bom_lines(
            *,
            material_item:items!bom_lines_material_item_id_fkey(id, code, name, unit)
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// BOM 생성 (헤더 + 라인 한번에)
export function useCreateBom() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { product_item_id: string; version?: number; lines: BomLineInput[] }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      // 헤더 생성
      const { data: header, error: headerErr } = await supabase
        .from('bom_headers')
        .insert({
          company_id: profile.company_id,
          product_item_id: input.product_item_id,
          version: input.version ?? 1,
        })
        .select()
        .single()
      if (headerErr) throw headerErr

      // 라인 생성
      const lines = input.lines.map((line, idx) => ({
        bom_header_id: header.id,
        material_item_id: line.material_item_id,
        quantity: line.quantity,
        sort_order: line.sort_order ?? idx,
      }))
      const { error: linesErr } = await supabase
        .from('bom_lines')
        .insert(lines)
      if (linesErr) throw linesErr

      return header
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bom.byItem(variables.product_item_id) })
    },
  })
}

// BOM 라인 업데이트 (RPC로 단일 트랜잭션 보장)
export function useUpdateBomLines() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bomHeaderId, itemId, lines }: { bomHeaderId: string; itemId: string; lines: BomLineInput[] }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const linesPayload = lines.map((line, idx) => ({
        material_item_id: line.material_item_id,
        quantity: line.quantity,
        sort_order: line.sort_order ?? idx,
      }))

      const { error } = await supabase.rpc('update_bom_lines', {
        p_bom_header_id: bomHeaderId,
        p_company_id: profile.company_id,
        p_lines: JSON.stringify(linesPayload),
      })
      if (error) throw error
      return { itemId }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bom.byItem(variables.itemId) })
    },
  })
}

export function useDeleteBom() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bom_headers')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bom.all })
    },
  })
}
