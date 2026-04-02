'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import { escapeFilterValue } from '@/lib/utils'
import type { BomLineInput } from '@/lib/validations/bom'

export type BomFilters = ListFilters & {
  materialType?: string
}

// BOM 페이지: 전체 품목 + BOM 여부 조회 (품목 중심 뷰)
export function useBomItemList(filters: BomFilters = {}) {
  const supabase = createClient()
  const { search, page = 1, pageSize = 50, materialType } = filters

  return useQuery({
    queryKey: queryKeys.bom.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select(`
          id, code, name, unit, item_type, material_type, description, is_active,
          bom_headers!bom_headers_product_item_id_fkey(
            id, version, is_active,
            bom_lines(
              id, quantity, sort_order,
              material_item:items!bom_lines_material_item_id_fkey(id, code, name, unit, material_type, item_type)
            )
          )
        `, { count: 'exact' })
        .eq('is_active', true)
        .order('material_type')
        .order('code')

      // material_type 필터
      if (materialType && materialType !== 'all') {
        query = query.eq('material_type', materialType)
      }

      // 검색
      if (search) {
        const s = escapeFilterValue(search)
        query = query.or(`name.ilike.%${s}%,code.ilike.%${s}%`)
      }

      // 페이지네이션
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query
      if (error) throw error

      // BOM 라인 sort_order 정렬 + 활성 BOM만 필터
      // BOM이 있는 품목만 필터 (조립가능=Y만 표시)
      const processed = (data ?? [])
        .map((item: any) => {
          const activeBom = (item.bom_headers ?? [])
            .filter((bh: any) => bh.is_active)
            .sort((a: any, b: any) => (b.version ?? 0) - (a.version ?? 0))[0]
          return {
            ...item,
            hasBom: !!activeBom,
            activeBom: activeBom ? {
              ...activeBom,
              bom_lines: [...(activeBom.bom_lines ?? [])].sort(
                (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
              ),
            } : null,
          }
        })
        .filter((item: any) => item.hasBom)

      return { data: processed, count: processed.length, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

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
            material_item:items!bom_lines_material_item_id_fkey(id, code, name, unit, material_type, item_type)
          )
        `)
        .eq('product_item_id', itemId)
        .order('version', { ascending: false })
      if (error) throw error
      // bom_lines sort_order 정렬
      return (data ?? []).map((bom) => ({
        ...bom,
        bom_lines: [...(bom.bom_lines ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }))
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
      return {
        ...data,
        bom_lines: [...(data.bom_lines ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }
    },
    enabled: !!id,
  })
}

// BOM 생성 (RPC로 헤더+라인 단일 트랜잭션 보장, 버전 자동 부여)
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

      const linesPayload = input.lines.map((line, idx) => ({
        material_item_id: line.material_item_id,
        quantity: line.quantity,
        sort_order: line.sort_order ?? idx,
      }))

      const { data, error } = await supabase.rpc('create_bom', {
        p_company_id: profile.company_id,
        p_product_item_id: input.product_item_id,
        p_version: input.version ?? undefined,
        p_lines: JSON.stringify(linesPayload),
      })
      if (error) throw error
      return { id: data as string }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bom.all })
      qc.invalidateQueries({ queryKey: queryKeys.bom.byItem(variables.product_item_id) })
    },
    retry: 0,
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
      qc.invalidateQueries({ queryKey: queryKeys.bom.all })
      qc.invalidateQueries({ queryKey: queryKeys.bom.byItem(variables.itemId) })
      qc.invalidateQueries({ queryKey: queryKeys.bom.detail(variables.bomHeaderId) })
    },
    retry: 0,
  })
}

// BOM 비활성화 (soft delete)
export function useDeleteBom() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, productItemId }: { id: string; productItemId: string }) => {
      const { error } = await supabase
        .from('bom_headers')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
      return { productItemId }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bom.all })
      qc.invalidateQueries({ queryKey: queryKeys.bom.byItem(variables.productItemId) })
    },
    retry: 0,
  })
}

// BOM 활성화 복원
export function useActivateBom() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, productItemId }: { id: string; productItemId: string }) => {
      const { error } = await supabase
        .from('bom_headers')
        .update({ is_active: true })
        .eq('id', id)
      if (error) throw error
      return { productItemId }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bom.all })
      qc.invalidateQueries({ queryKey: queryKeys.bom.byItem(variables.productItemId) })
    },
    retry: 0,
  })
}

// 새 버전 생성 (RPC로 구버전 비활성 + 신버전 생성 + 라인 복사를 단일 트랜잭션 보장)
export function useCreateBomVersion() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sourceBomId, productItemId }: { sourceBomId: string; productItemId: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const { data, error } = await supabase.rpc('create_bom_version', {
        p_company_id: profile.company_id,
        p_source_bom_id: sourceBomId,
        p_product_item_id: productItemId,
      })
      if (error) throw error
      return { id: data as string }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bom.all })
      qc.invalidateQueries({ queryKey: queryKeys.bom.byItem(variables.productItemId) })
    },
    retry: 0,
  })
}
