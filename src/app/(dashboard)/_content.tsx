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

      {/* 업무 현황 — 테이블 레이아웃 */}
      <section>
        <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] mb-3">업무 현황</h2>
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background/50 border-b border-border">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">구분</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">항목</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">값</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {summaryLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-2"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-2 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-2"></td>
                  </tr>
                ))
              ) : summary ? (
                <>
                  <SummaryRow
                    category="처리 대기"
                    icon={ClipboardList}
                    label="발주서 (임시)"
                    value={`${summary.pending.draft_po_count}건`}
                    href="/purchase-orders"
                  />
                  <SummaryRow
                    icon={ShoppingCart}
                    label="판매주문 (미출고)"
                    value={`${summary.pending.draft_so_count + summary.pending.confirmed_so_count}건`}
                    href="/sales-orders"
                  />
                  <SummaryRow
                    category="이번 달"
                    icon={TrendingUp}
                    label="매입"
                    value={formatAmount(summary.monthly_purchase.total_amount)}
                    sub={`${summary.monthly_purchase.order_count}건`}
                  />
                  <SummaryRow
                    icon={TrendingUp}
                    label="매출"
                    value={formatAmount(summary.monthly_sales.total_amount)}
                    sub={`${summary.monthly_sales.order_count}건`}
                  />
                  <SummaryRow
                    label="이익"
                    value={formatAmount(summary.monthly_sales.total_amount - summary.monthly_sales.total_cogs)}
                    className="bg-background/30"
                  />
                </>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

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
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background/50 border-b border-border">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">품목</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">현재고</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">안전재고</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">부족</th>
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
                        className="h-7 text-xs relative before:absolute before:-inset-2 before:content-['']"
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

function SummaryRow({ category, icon: Icon, label, value, sub, href, className }: {
  category?: string
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  href?: string
  className?: string
}) {
  return (
    <tr className={`border-b border-border last:border-0 ${className ?? ''}`}>
      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
        {category ?? ''}
      </td>
      <td className="px-4 py-2">
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <span>{label}</span>
        </span>
      </td>
      <td className="px-4 py-2 font-data text-right font-medium whitespace-nowrap">
        {value}
        {sub && <span className="text-xs text-muted-foreground ml-1.5">({sub})</span>}
      </td>
      <td className="px-4 py-2 text-right">
        {href && (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={href} />}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            보기 <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </td>
    </tr>
  )
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
