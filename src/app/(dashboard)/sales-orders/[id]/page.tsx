'use client'

import { use } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api/error'
import { Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { formatAmount, formatUnitPrice, formatQty, formatDate } from '@/lib/format'
import { useSalesOrder, useUpdateSalesOrderStatus, useExecuteShipment, useCancelShipment } from '@/hooks/use-sales-orders'
import { CancelDialog } from '@/components/common/cancel-dialog'

export default function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: so, isLoading } = useSalesOrder(id)
  const updateStatus = useUpdateSalesOrderStatus()
  const executeShipment = useExecuteShipment()
  const cancelShipment = useCancelShipment()

  const handleConfirm = async () => {
    try {
      await updateStatus.mutateAsync({ id, status: 'confirmed', expectedStatus: 'draft' })
      toast.success('판매주문 확정 완료')
    } catch (err) {
      toast.error(extractErrorMessage(err, '상태 변경 실패'))
    }
  }

  const handleShip = async () => {
    if (!confirm('출고를 실행하시겠습니까? 재고가 차감됩니다.')) return
    try {
      const result = await executeShipment.mutateAsync(id)
      const data = result.data
      toast.success(`출고 완료 — 매출원가 ${formatAmount(data?.total_cogs)}`)
    } catch (err) {
      toast.error(extractErrorMessage(err, '출고 실행 실패'))
    }
  }

  const handleCancel = async () => {
    if (!confirm('이 판매주문을 취소하시겠습니까?')) return
    try {
      await updateStatus.mutateAsync({ id, status: 'cancelled', expectedStatus: so?.status ?? 'draft' })
      toast.success('판매주문 취소 완료')
    } catch (err) {
      toast.error(extractErrorMessage(err, '상태 변경 실패'))
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="판매 주문 상세" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      </div>
    )
  }

  if (!so) return <div className="text-center py-16 text-muted-foreground">판매주문을 찾을 수 없습니다</div>

  const canConfirm = so.status === 'draft'
  const canShip = so.status === 'confirmed'
  const canCancel = so.status === 'draft' || so.status === 'confirmed'
  const isShipped = so.status === 'shipped'
  const isCancelled = so.status === 'cancelled'

  const handleCancelShipment = async (reason: string) => {
    try {
      await cancelShipment.mutateAsync({ id, reason: reason || undefined })
      toast.success('출고 취소 완료 — 재고가 복원되었습니다')
    } catch (err) {
      toast.error(extractErrorMessage(err, '출고 취소 실패'))
      throw err
    }
  }

  // 매출원가 합계 (출고 완료 후)
  const lines = (so as any).sales_order_lines ?? []
  const totalCogs = lines.reduce((sum: number, l: any) => sum + (Number(l.cost_of_goods) || 0), 0)
  const grossProfit = Number(so.total_amount) - totalCogs

  return (
    <div>
      <PageHeader title={so.order_number}>
        {canConfirm && (
          <Button size="sm" onClick={handleConfirm} disabled={updateStatus.isPending}
            className="bg-info hover:bg-info/80">
            확정
          </Button>
        )}
        {canShip && (
          <Button size="sm" onClick={handleShip}
            disabled={executeShipment.isPending}
            className="bg-primary hover:bg-primary-hover">
            <Truck className="h-4 w-4 mr-1" />
            {executeShipment.isPending ? '출고 처리 중...' : '출고 실행'}
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" size="sm" onClick={handleCancel}
            disabled={updateStatus.isPending} className="text-destructive">
            취소
          </Button>
        )}
        {isShipped && (
          <CancelDialog
            title="출고 취소"
            description="출고를 취소하면 차감된 재고가 복원됩니다. 이 작업은 되돌릴 수 없습니다."
            triggerLabel="출고 취소"
            onConfirm={handleCancelShipment}
            isPending={cancelShipment.isPending}
          />
        )}
      </PageHeader>

      {/* SO 헤더 정보 */}
      <section className="pb-6 mb-6 border-b border-border">
        <dl className="grid grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs mb-1">상태</dt>
            <dd><StatusBadge status={so.status} /></dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">고객</dt>
            <dd className="font-medium">{(so as any).customer?.name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">주문일</dt>
            <dd className="font-data">{formatDate(so.order_date)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">매출 금액</dt>
            <dd className="font-data font-medium">{formatAmount(so.total_amount)}</dd>
          </div>
          {isShipped && (
            <>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">매출원가</dt>
                <dd className="font-data">{formatAmount(totalCogs)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-1">매출이익</dt>
                <dd className={`font-data font-medium ${grossProfit >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                  {formatAmount(grossProfit)}
                </dd>
              </div>
            </>
          )}
          {so.notes && (
            <div className="col-span-4">
              <dt className="text-muted-foreground text-xs mb-1">비고</dt>
              <dd>{so.notes}</dd>
            </div>
          )}
          {(so as any).cancelled_shipment_at && (
            <div className="col-span-4 border-t border-border pt-3 mt-1">
              <dt className="text-muted-foreground text-xs mb-1">출고 취소일</dt>
              <dd className="font-data text-destructive">{formatDate((so as any).cancelled_shipment_at)}</dd>
            </div>
          )}
          {(so as any).cancel_reason && (
            <div className="col-span-4">
              <dt className="text-muted-foreground text-xs mb-1">취소 사유</dt>
              <dd className="text-destructive">{(so as any).cancel_reason}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* 판매 라인 */}
      <section>
        <h3 className="font-heading font-semibold text-[15px] mb-3">판매 품목</h3>
          <Table>
            <TableHeader>
              <TableRow className="bg-background/50">
                <TableHead>코드</TableHead>
                <TableHead>품목명</TableHead>
                <TableHead>출고 창고</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead className="text-right">판매 단가</TableHead>
                <TableHead className="text-right">매출 금액</TableHead>
                {isShipped && <TableHead className="text-right">매출원가</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line: any) => (
                <TableRow key={line.id}>
                  <TableCell className="font-data">{line.item?.code}</TableCell>
                  <TableCell>{line.item?.name}</TableCell>
                  <TableCell>{line.warehouse?.name ?? '-'}</TableCell>
                  <TableCell className="font-data text-right">
                    {formatQty(line.quantity, line.item?.unit)}
                  </TableCell>
                  <TableCell className="font-data text-right">{formatUnitPrice(line.unit_price)}</TableCell>
                  <TableCell className="font-data text-right">{formatAmount(line.line_amount)}</TableCell>
                  {isShipped && (
                    <TableCell className="font-data text-right">
                      {formatAmount(line.cost_of_goods)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              <TableRow className="bg-background/30">
                <TableCell colSpan={isShipped ? 5 : 5} className="text-right text-xs font-medium text-text-secondary">
                  합계
                </TableCell>
                <TableCell className="font-data font-medium text-right">
                  {formatAmount(so.total_amount)}
                </TableCell>
                {isShipped && (
                  <TableCell className="font-data font-medium text-right">
                    {formatAmount(totalCogs)}
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
      </section>

      {/* 하단 액션 */}
      <div className="flex justify-between mt-4">
        <Button variant="outline" render={<Link href="/sales-orders" />}>
          목록으로
        </Button>
        {isShipped && (
          <Button variant="outline" render={<Link href="/inventory" />}>
          재고 현황 확인 →
          </Button>
        )}
      </div>
    </div>
  )
}
