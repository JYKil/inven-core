'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryDb, type QueryOp } from '@/lib/api/db-client'
import { queryKeys, type ListFilters } from '@/lib/queries/keys'
import type { Database } from '@/types/db'
import { escapeFilterValue } from '@/lib/utils'

type Customer = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']

export type CustomerFilters = ListFilters & {
  includeInactive?: boolean
}

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
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

      const { data, error, count } = await queryDb<Customer[]>('customers', ops)
      if (error) throw error
      return { data: data as Customer[], count: count ?? 0, page, pageSize }
    },
    placeholderData: keepPreviousData,
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async () => {
      const { data, error } = await queryDb<Customer>('customers', [
        { type: 'select', columns: '*' },
        { type: 'eq', column: 'id', value: id },
      ], { single: true })
      if (error) throw error
      return data as Customer
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<CustomerInsert, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await queryDb<Customer>('customers', [
        { type: 'insert', values: input },
        { type: 'select' },
      ], { single: true })
      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.all })
    },
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: CustomerUpdate & { id: string }) => {
      const { name, business_number, address, receipt_currency, contact_email, notes } = input
      const { data, error } = await queryDb<Customer>('customers', [
        { type: 'update', values: { name, business_number, address, receipt_currency, contact_email, notes } },
        { type: 'eq', column: 'id', value: id },
        { type: 'select' },
      ], { single: true })
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await queryDb('customers', [
        { type: 'update', values: { is_active: false } },
        { type: 'eq', column: 'id', value: id },
      ])
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.all })
    },
  })
}
