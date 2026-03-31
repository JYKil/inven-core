'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'

// 재고 수불부
export function useInventoryLedger(filters: {
  startDate: string
  endDate: string
  itemId?: string
  warehouseId?: string
  enabled?: boolean
}) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.reports.inventoryLedger({
      startDate: filters.startDate,
      endDate: filters.endDate,
      itemId: filters.itemId,
      warehouseId: filters.warehouseId,
    }),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const { data, error } = await supabase.rpc('report_inventory_ledger', {
        p_company_id: profile.company_id,
        p_start_date: filters.startDate,
        p_end_date: filters.endDate,
        p_item_id: filters.itemId || undefined,
        p_warehouse_id: filters.warehouseId || undefined,
      })
      if (error) throw error
      return data as {
        period: { start_date: string; end_date: string }
        summary: Array<{
          item_id: string; warehouse_id: string
          item_code: string; item_name: string; warehouse_name: string
          opening_qty: number; opening_value: number
          total_in_qty: number; total_out_qty: number; closing_qty: number
        }>
        transactions: Array<{
          item_id: string; warehouse_id: string
          item_code: string; item_name: string; warehouse_name: string
          transaction_type: string; quantity: number; total_cost: number
          transaction_date: string; reference_type: string; reference_id: string
        }>
      }
    },
    enabled: filters.enabled !== false && !!filters.startDate && !!filters.endDate,
  })
}

// 창고별 재고 현황
export function useWarehouseStockReport(warehouseId?: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.reports.warehouseStock(warehouseId),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const { data, error } = await supabase.rpc('report_warehouse_stock', {
        p_company_id: profile.company_id,
        p_warehouse_id: warehouseId || undefined,
      })
      if (error) throw error
      return data as Array<{
        warehouse_id: string; warehouse_code: string; warehouse_name: string
        item_id: string; item_code: string; item_name: string; unit: string
        total_qty: number; total_value: number; avg_unit_cost: number
      }>
    },
  })
}

// 매출 보고서
export function useSalesReport(filters: {
  startDate: string
  endDate: string
  partnerId?: string
  enabled?: boolean
}) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.reports.sales({
      startDate: filters.startDate,
      endDate: filters.endDate,
      partnerId: filters.partnerId,
    }),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const { data, error } = await supabase.rpc('report_sales', {
        p_company_id: profile.company_id,
        p_start_date: filters.startDate,
        p_end_date: filters.endDate,
        p_partner_id: filters.partnerId || undefined,
      })
      if (error) throw error
      return data as {
        period: { start_date: string; end_date: string }
        totals: {
          total_revenue: number; total_cogs: number
          total_profit: number; total_quantity: number; order_count: number
        }
        profit_margin: number
        lines: Array<{
          sales_order_id: string; order_number: string; order_date: string
          partner_name: string; item_code: string; item_name: string; unit: string
          quantity: number; unit_price: number; line_amount: number
          cost_of_goods: number; gross_profit: number
        }>
      }
    },
    enabled: filters.enabled !== false && !!filters.startDate && !!filters.endDate,
  })
}
