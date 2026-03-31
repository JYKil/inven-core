'use client'

import Link from 'next/link'
import {
  AlertTriangle, Package, ShoppingCart, ClipboardList,
  Users, Warehouse, ArrowRight, CheckCircle, TrendingUp,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatAmount, formatQty } from '@/lib/format'
import { useReorderAlerts, useDashboardSummary } from '@/hooks/use-dashboard'

export default function DashboardContent() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: alerts, isLoading: alertsLoading } = useReorderAlerts()

  const showOnboarding = summary && (
    summary.onboarding.partner_count === 0 ||
    summary.onboarding.warehouse_count === 0 ||
    summary.onboarding.item_count === 0
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-[28px] font-bold tracking-[-0.02em] text-foreground">
          대시보드
        </h1>
        <p className="text-[14px] text-text-secondary mt-1">
          재고수불관리 시스템
        </p>
      </div>

      {/* 온보딩 위젯 — 기초 데이터가 없을 때만 */}
      {showOnboarding && (
        <section className="border border-border rounded-lg p-6">
          <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] mb-4">시작하기</h2>
          <p className="text-[13px] text-muted-foreground mb-4">
            기초 데이터를 등록하면 재고 관리를 시작할 수 있습니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <OnboardingItem
              icon={Users}
              title="거래처"
              count={summary.onboarding.partner_count}
              href="/partners/new"
            />
            <OnboardingItem
              icon={Warehouse}
              title="창고"
              count={summary.onboarding.warehouse_count}
              href="/warehouses/new"
            />
            <OnboardingItem
              icon={Package}
              title="품목"
              count={summary.onboarding.item_count}
              href="/items/new"
            />
          </div>
        </section>
      )}

      {/* 처리 대기 + 이번 달 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))
        ) : summary ? (
          <>
            <SummaryCard
              label="발주서 (임시)"
              value={String(summary.pending.draft_po_count)}
              icon={ClipboardList}
              href="/purchase-orders"
            />
            <SummaryCard
              label="판매주문 (미출고)"
              value={String(summary.pending.draft_so_count + summary.pending.confirmed_so_count)}
              icon={ShoppingCart}
              href="/sales-orders"
            />
            <SummaryCard
              label="이번 달 매입"
              value={formatAmount(summary.monthly_purchase.total_amount)}
              sub={`${summary.monthly_purchase.order_count}건`}
              icon={TrendingUp}
            />
            <SummaryCard
              label="이번 달 매출"
              value={formatAmount(summary.monthly_sales.total_amount)}
              sub={`${summary.monthly_sales.order_count}건`}
              icon={TrendingUp}
            />
          </>
        ) : null}
      </div>

      {/* 재발주 알림 */}
      <section>
        <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] mb-3">재발주 알림</h2>
        {alertsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <div className="flex items-center gap-3 border border-secondary/30 rounded-lg p-4 bg-secondary/5">
            <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0" />
            <p className="text-sm text-secondary font-medium">모든 품목의 재고가 충분합니다</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background/50 border-b border-border">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">품목</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">현재고</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">안전재고</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">부족</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.item_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <span className="font-data text-xs mr-2">{a.item_code}</span>
                      {a.item_name}
                    </td>
                    <td className="px-4 py-2 font-data text-right text-destructive">
                      {formatQty(a.current_qty, a.unit)}
                    </td>
                    <td className="px-4 py-2 font-data text-right">
                      {formatQty(a.min_stock_qty, a.unit)}
                    </td>
                    <td className="px-4 py-2 font-data text-right text-destructive font-medium">
                      {formatQty(a.shortage_qty, a.unit)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href="/purchase-orders/new" />}
                        className="h-7 text-xs"
                      >
                        발주 생성
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({ label, value, sub, icon: Icon, href }: {
  label: string; value: string; sub?: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
}) {
  const content = (
    <div className={`border border-border rounded-lg p-4 ${href ? 'hover:bg-card/60 transition-colors cursor-pointer' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="font-heading text-xl sm:text-2xl lg:text-[36px] font-bold tracking-[-0.02em] leading-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}

function OnboardingItem({ icon: Icon, title, count, href }: {
  icon: React.ComponentType<{ className?: string }>
  title: string; count: number; href: string
}) {
  const done = count > 0
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 p-3 border border-border rounded-md hover:bg-card/60 transition-colors"
    >
      <Icon className={`h-4 w-4 ${done ? 'text-secondary' : 'text-muted-foreground'}`} />
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">
          {done ? `${count}개 등록됨` : '등록 필요'}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  )
}
