'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, PackageSearch, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { formatDate, formatQty, formatAmount, formatUnitPrice } from '@/lib/format'
import { useAssemblyOrder } from '@/hooks/use-assembly-orders'

export default function AssemblyOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: order, isLoading } = useAssemblyOrder(id)

  if (isLoading) {
    return (
      <div>
        <PageHeader title="조립 상세" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full max-w-md" />
          ))}
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="조립 상세" />
        <p className="text-text-secondary">조립 지시를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const productItem = order.product_item as any
  const warehouse = order.warehouse as any
  const bomHeader = order.bom_header as any
  const lines = (order.assembly_order_lines ?? []) as any[]

  return (
    <div>
      <PageHeader title="조립 상세">
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/assembly-orders" />}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록으로
          </Button>
          <Button
            variant="outline"
            render={<Link href={`/inventory?item_id=${productItem?.id ?? ''}`} />}
          >
            <PackageSearch className="h-4 w-4 mr-1" />
            재고 현황 확인
          </Button>
          <Button
            variant="outline"
            render={<Link href={`/assembly-orders/new?product_item_id=${productItem?.id ?? ''}`} />}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            동일 품목 재조립
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-6">
        {/* 헤더 정보 */}
        <section className="pb-6 border-b border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-text-secondary mb-1">조립번호</p>
              <p className="text-sm font-data font-semibold">{order.order_number}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">상태</p>
              <StatusBadge status={order.status} />
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">결과 품목</p>
              <p className="text-sm">
                <span className="font-data">{productItem?.code}</span>
                <span className="text-text-secondary ml-1">{productItem?.name}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">수량</p>
              <p className="text-sm font-data">
                {formatQty(Number(order.quantity), productItem?.unit)}
                <span className="text-text-secondary ml-1">{productItem?.unit}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">조립 창고</p>
              <p className="text-sm">{warehouse?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">조립일</p>
              <p className="text-sm font-data">{formatDate(order.assembly_date)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">BOM 버전</p>
              <p className="text-sm font-data">v{bomHeader?.version ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">생성일</p>
              <p className="text-sm font-data">{formatDate(order.created_at)}</p>
            </div>
          </div>
        </section>

        {/* 원가 정보 */}
        {order.total_cost != null && (
          <section className="pb-6 border-b border-border">
            <h2 className="font-heading font-semibold text-[15px] mb-3">원가 정보</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-text-secondary mb-1">총 원가</p>
                <p className="text-lg font-data font-semibold text-primary">
                  {formatAmount(Number(order.total_cost))}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">단위 원가</p>
                <p className="text-lg font-data font-semibold">
                  {formatUnitPrice(Number(order.unit_cost))}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 재료 소비 내역 */}
        <section>
          <h2 className="font-heading font-semibold text-[15px] mb-3">재료 소비 내역</h2>
          <div className="border border-border rounded-[8px] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background/50">
                    <TableHead>재료 품목</TableHead>
                    <TableHead className="text-right">필요 수량</TableHead>
                    <TableHead className="text-right">소비 수량</TableHead>
                    <TableHead className="text-right">소비 원가</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-text-secondary py-6">
                        재료 소비 내역이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((line: any) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <span className="font-data">{line.material_item?.code}</span>
                          <span className="text-text-secondary ml-1">{line.material_item?.name}</span>
                        </TableCell>
                        <TableCell className="font-data text-right">
                          {formatQty(Number(line.required_qty), line.material_item?.unit)}
                        </TableCell>
                        <TableCell className="font-data text-right">
                          {formatQty(Number(line.consumed_qty), line.material_item?.unit)}
                        </TableCell>
                        <TableCell className="font-data text-right">
                          {formatAmount(Number(line.consumed_cost))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </div>
        </section>
      </div>
    </div>
  )
}
