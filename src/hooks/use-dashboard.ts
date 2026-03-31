'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'

// 재발주 필요 품목
export function useReorderAlerts() {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.dashboard.reorderAlerts(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const { data, error } = await supabase.rpc('dashboard_reorder_alerts', {
        p_company_id: profile.company_id,
      })
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
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다')
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!profile?.company_id) throw new Error('회사 정보를 찾을 수 없습니다')

      const { data, error } = await supabase.rpc('dashboard_summary', {
        p_company_id: profile.company_id,
      })
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
          partner_count: number
          warehouse_count: number
          item_count: number
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5분
  })
}
