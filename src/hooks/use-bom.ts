'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryDb, rpcDb, type QueryOp } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import { escapeFilterValue } from '@/lib/utils'
import type { BomLineInput } from '@/lib/validations/bom'

export type BomFilters = ListFilters & {
  materialType?: string
}

// BOM 페이지: 전체 품목 + BOM 여부 조회 (품목 중심 뷰)
export function useBomItemList(filters: BomFilters = {}) {
  const { search, page = 1, pageSize = 50, materialType } = filters

  return useQuery({
    queryKey: queryKeys.bom.list(filters),
    queryFn: async () => {
      const ops: QueryOp[] = [
        {
          type: 'select',
          columns: `
          id, code, name, unit, item_type, material_type, description, is_active,
          bom_headers!bom_headers_product_item_id_fkey(
            id, version, is_active,
            bom_lines(
              id, quantity, sort_order,
              material_item:items!bom_lines_material_item_id_fkey(id, code, name, unit, material_type, item_type)
            )
          )
        `,
          options: { count: 'exact' },
        },
        { type: 'eq', column: 'is_active', value: true },
        { type: 'order', column: 'material_type' },
        { type: 'order', column: 'code' },
      ]

      // material_type 필터
      if (materialType && materialType !== 'all') {
        ops.push({ type: 'eq', column: 'material_type', value: materialType })
      }

      // 검색
      if (search) {
        const s = escapeFilterValue(search)
        ops.push({ type: 'or', filter: `name.ilike.%${s}%,code.ilike.%${s}%` })
      }

      // 페이지네이션
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      ops.push({ type: 'range', from, to })

      const { data, error, count } = await queryDb<any[]>('items', ops)
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
  return useQuery({
    queryKey: queryKeys.bom.byItem(itemId),
    queryFn: async () => {
      const { data, error } = await queryDb<any[]>('bom_headers', [
        {
          type: 'select',
          columns: `
          *,
          bom_lines(
            *,
            material_item:items!bom_lines_material_item_id_fkey(id, code, name, unit, material_type, item_type)
          )
        `,
        },
        { type: 'eq', column: 'product_item_id', value: itemId },
        { type: 'order', column: 'version', options: { ascending: false } },
      ])
      if (error) throw error
      // bom_lines sort_order 정렬
      return (data ?? []).map((bom: any) => ({
        ...bom,
        bom_lines: [...(bom.bom_lines ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }))
    },
    enabled: !!itemId,
  })
}

export function useBomDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.bom.detail(id),
    queryFn: async () => {
      const { data, error } = await queryDb<any>('bom_headers', [
        {
          type: 'select',
          columns: `
          *,
          product_item:items!bom_headers_product_item_id_fkey(id, code, name, unit),
          bom_lines(
            *,
            material_item:items!bom_lines_material_item_id_fkey(id, code, name, unit)
          )
        `,
        },
        { type: 'eq', column: 'id', value: id },
      ], { single: true })
      if (error) throw error
      return {
        ...data,
        bom_lines: [...(data.bom_lines ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }
    },
    enabled: !!id,
  })
}

// BOM 생성 (API Route 경유, 서버에서 company_id 주입)
export function useCreateBom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { product_item_id: string; version?: number; lines: BomLineInput[] }) => {
      const res = await fetch('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message ?? 'BOM 생성 실패')
      }
      const { data } = await res.json()
      return { id: data.bom_id as string }
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bomHeaderId, itemId, lines }: { bomHeaderId: string; itemId: string; lines: BomLineInput[] }) => {
      const linesPayload = lines.map((line, idx) => ({
        material_item_id: line.material_item_id,
        quantity: line.quantity,
        sort_order: line.sort_order ?? idx,
      }))

      const { error } = await rpcDb('update_bom_lines', {
        p_bom_header_id: bomHeaderId,
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, productItemId }: { id: string; productItemId: string }) => {
      const { error } = await queryDb('bom_headers', [
        { type: 'update', values: { is_active: false } },
        { type: 'eq', column: 'id', value: id },
      ])
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, productItemId }: { id: string; productItemId: string }) => {
      const { error } = await queryDb('bom_headers', [
        { type: 'update', values: { is_active: true } },
        { type: 'eq', column: 'id', value: id },
      ])
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

// 새 버전 생성 (API Route 경유, 서버에서 company_id 주입, product_item_id는 source에서 자동 추출)
export function useCreateBomVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sourceBomId, productItemId }: { sourceBomId: string; productItemId: string }) => {
      const res = await fetch('/api/bom/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_bom_id: sourceBomId, product_item_id: productItemId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message ?? 'BOM 버전 생성 실패')
      }
      const { data } = await res.json()
      return { id: data.bom_id as string }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bom.all })
      qc.invalidateQueries({ queryKey: queryKeys.bom.byItem(variables.productItemId) })
    },
    retry: 0,
  })
}
