'use client'

import { useQuery } from '@tanstack/react-query'
import { rpcDb } from '@/lib/api/db-client'
import { queryKeys } from '@/lib/queries/keys'

// 재발주 필요 품목
export function useReorderAlerts() {
  return useQuery({
    queryKey: queryKeys.dashboard.reorderAlerts(),
    queryFn: async () => {
      const { data, error } = await rpcDb('dashboard_reorder_alerts')
      if (error) throw error
      return data as Array<{
        item_id: string; item_code: string; item_name: string
        unit: string; min_stock_qty: number
        current_qty: number; shortage_qty: number
      }>
    },
    staleTime: 5 * 60 * 1000, // 5분
  })
}

// 대시보드 요약
export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async () => {
      const { data, error } = await rpcDb('dashboard_summary')
      if (error) throw error
      return data as {
        pending: {
          draft_po_count: number
          draft_so_count: number
          confirmed_so_count: number
        }
        monthly_purchase: {
          total_amount: number
          order_count: number
        }
        monthly_sales: {
          total_amount: number
          total_cogs: number
          order_count: number
        }
        onboarding: {
          vendor_count: number
          customer_count: number
          warehouse_count: number
          item_count: number
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5분
  })
}
