'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryDb, type QueryOp } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/db'
import { escapeFilterValue } from '@/lib/utils'

type Vendor = Database['public']['Tables']['vendors']['Row']
type VendorInsert = Database['public']['Tables']['vendors']['Insert']
type VendorUpdate = Database['public']['Tables']['vendors']['Update']

export type VendorFilters = ListFilters & {
  includeInactive?: boolean
}

export function useVendors(filters: VendorFilters = {}) {
  return useQuery({
    queryKey: queryKeys.vendors.list(filters),
    queryFn: async () => {
      const ops: QueryOp[] = [
        { type: 'select', columns: '*', options: { count: 'exact' } },
        { type: 'order', column: 'name' },
      ]

      if (!filters.includeInactive) ops.push({ type: 'eq', column: 'is_active', value: true })
      if (filters.search) {
        const s = escapeFilterValue(filters.search)
        ops.push({ type: 'or', filter: `name.ilike.%${s}%,business_number.ilike.%${s}%` })
      }

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20
      const from = (page - 1) * pageSize
      ops.push({ type: 'range', from, to: from + pageSize - 1 })

      const { data, error, count } = await queryDb<Vendor[]>('vendors', ops)
      if (error) throw error
      return { data: data as Vendor[], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: queryKeys.vendors.detail(id),
    queryFn: async () => {
      const { data, error } = await queryDb<Vendor>('vendors', [
        { type: 'select', columns: '*' },
        { type: 'eq', column: 'id', value: id },
      ], { single: true })
      if (error) throw error
      return data as Vendor
    },
    enabled: !!id,
  })
}

export function useCreateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<VendorInsert, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await queryDb<Vendor>('vendors', [
        { type: 'insert', values: input },
        { type: 'select' },
      ], { single: true })
      if (error) throw error
      return data as Vendor
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vendors.all })
    },
  })
}

export function useUpdateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: VendorUpdate & { id: string }) => {
      const { name, business_number, address, bank_name, bank_code, account_number, account_holder, payment_currency, contact_email, notes } = input
      const { data, error } = await queryDb<Vendor>('vendors', [
        { type: 'update', values: { name, business_number, address, bank_name, bank_code, account_number, account_holder, payment_currency, contact_email, notes } },
        { type: 'eq', column: 'id', value: id },
        { type: 'select' },
      ], { single: true })
      if (error) throw error
      return data as Vendor
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.vendors.all })
      qc.setQueryData(queryKeys.vendors.detail(data.id), data)
    },
  })
}

export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await queryDb('vendors', [
        { type: 'update', values: { is_active: false } },
        { type: 'eq', column: 'id', value: id },
      ])
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vendors.all })
    },
  })
}
