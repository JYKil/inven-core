'use client'

import { use } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api/error'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { formatDate, formatQty, formatAmount } from '@/lib/format'
import { useWarehouseTransfer, useCancelTransfer } from '@/hooks/use-warehouse-transfers'
import { CancelDialog } from '@/components/common/cancel-dialog'

export default function WarehouseTransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: transfer, isLoading } = useWarehouseTransfer(id)
  const cancelTransfer = useCancelTransfer()

  const handleCancelTransfer = async (reason: string) => {
    try {
      await cancelTransfer.mutateAsync({ id, reason: reason || undefined })
      toast.success('이동 취소 완료 — 재고가 복원되었습니다')
    } catch (err) {
      toast.error(extractErrorMessage(err, '이동 취소 실패'))
      throw err
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="창고 이동 상세" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      </div>
    )
  }

  if (!transfer) return <div className="text-center py-16 text-muted-foreground">이동 내역을 찾을 수 없습니다</div>

  const lines = (transfer as any).warehouse_transfer_lines ?? []

  return (
    <div>
      <PageHeader title={transfer.transfer_number}>
        {transfer.status === 'completed' && (
          <CancelDialog
            title="이동 취소"
            description="이동을 취소하면 출발지/도착지 재고가 원래대로 복원됩니다. 이 작업은 되돌릴 수 없습니다."
            triggerLabel="이동 취소"
            onConfirm={handleCancelTransfer}
            isPending={cancelTransfer.isPending}
          />
        )}
      </PageHeader>

      {/* 헤더 정보 */}
      <section className="pb-6 mb-6 border-b border-border">
        <dl className="grid grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs mb-1">상태</dt>
            <dd><StatusBadge status={transfer.status} /></dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">출발 창고</dt>
            <dd className="font-medium">{(transfer as any).from_warehouse?.name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">도착 창고</dt>
            <dd className="font-medium">{(transfer as any).to_warehouse?.name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">이동일</dt>
            <dd className="font-data">{formatDate(transfer.transfer_date)}</dd>
          </div>
          {transfer.notes && (
            <div className="col-span-4">
              <dt className="text-muted-foreground text-xs mb-1">비고</dt>
              <dd>{transfer.notes}</dd>
            </div>
          )}
          {(transfer as any).cancelled_at && (
            <div className="col-span-4 border-t border-border pt-3 mt-1">
              <dt className="text-muted-foreground text-xs mb-1">취소일</dt>
              <dd className="font-data text-destructive">{formatDate((transfer as any).cancelled_at)}</dd>
            </div>
          )}
          {(transfer as any).cancel_reason && (
            <div className="col-span-4">
              <dt className="text-muted-foreground text-xs mb-1">취소 사유</dt>
              <dd className="text-destructive">{(transfer as any).cancel_reason}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* 이동 라인 */}
      <section>
        <h3 className="font-heading font-semibold text-[15px] mb-3">이동 품목</h3>
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-background/50">
                <TableHead>코드</TableHead>
                <TableHead>품목명</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead className="text-right">이동 원가</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line: any) => (
                <TableRow key={line.id}>
                  <TableCell className="font-data">{line.item?.code}</TableCell>
                  <TableCell>{line.item?.name}</TableCell>
                  <TableCell className="font-data text-right">
                    {formatQty(line.quantity, line.item?.unit)}
                  </TableCell>
                  <TableCell className="font-data text-right">
                    {line.unit_cost != null ? formatAmount(line.unit_cost * line.quantity) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* 하단 액션 */}
      <div className="flex justify-between mt-4">
        <Button variant="outline" render={<Link href="/warehouse-transfers" />}>
          목록으로
        </Button>
        <Button variant="outline" render={<Link href="/inventory" />}>
          재고 현황 확인 →
        </Button>
      </div>
    </div>
  )
}
