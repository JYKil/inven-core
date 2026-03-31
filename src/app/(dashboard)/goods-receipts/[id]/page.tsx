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
import { CancelDialog } from '@/components/common/cancel-dialog'
import { formatDate, formatQty, formatUnitPrice, formatAmount } from '@/lib/format'
import { useGoodsReceipt, useCancelGoodsReceipt } from '@/hooks/use-goods-receipts'

export default function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: gr, isLoading } = useGoodsReceipt(id)
  const cancelGoodsReceipt = useCancelGoodsReceipt()

  const handleCancelReceipt = async (reason: string) => {
    try {
      await cancelGoodsReceipt.mutateAsync({ id, reason: reason || undefined })
      toast.success('입고 취소 완료 — 재고가 차감되었습니다')
    } catch (err) {
      toast.error(extractErrorMessage(err, '입고 취소 실패'))
      throw err
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="입고 상세" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      </div>
    )
  }

  if (!gr) return <div className="text-center py-16 text-muted-foreground">입고 문서를 찾을 수 없습니다</div>

  const lines = (gr as any).goods_receipt_lines ?? []
  const totalAmount = lines.reduce((sum: number, l: any) => sum + (Number(l.quantity) * Number(l.unit_price)), 0)

  return (
    <div>
      <PageHeader title={gr.receipt_number}>
        {gr.status === 'confirmed' && (
          <CancelDialog
            title="입고 취소"
            description="입고를 취소하면 생성된 재고가 제거됩니다. 이미 사용된 재고가 있으면 취소할 수 없습니다."
            triggerLabel="입고 취소"
            onConfirm={handleCancelReceipt}
            isPending={cancelGoodsReceipt.isPending}
          />
        )}
      </PageHeader>

      {/* 헤더 정보 */}
      <section className="pb-6 mb-6 border-b border-border">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs mb-1">상태</dt>
            <dd><StatusBadge status={gr.status} /></dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">입고 창고</dt>
            <dd className="font-medium">{(gr as any).warehouse?.name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">입고일</dt>
            <dd className="font-data">{formatDate(gr.receipt_date)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">발주서</dt>
            <dd className="font-data">
              {(gr as any).purchase_order?.po_number ? (
                <Link href={`/purchase-orders/${gr.po_id}`} className="text-primary hover:underline">
                  {(gr as any).purchase_order.po_number}
                </Link>
              ) : '-'}
            </dd>
          </div>
          {gr.notes && (
            <div className="col-span-2 md:col-span-4">
              <dt className="text-muted-foreground text-xs mb-1">비고</dt>
              <dd>{gr.notes}</dd>
            </div>
          )}
          {(gr as any).cancelled_at && (
            <div className="col-span-2 md:col-span-4 border-t border-border pt-3 mt-1">
              <dt className="text-muted-foreground text-xs mb-1">취소일</dt>
              <dd className="font-data text-destructive">{formatDate((gr as any).cancelled_at)}</dd>
            </div>
          )}
          {(gr as any).cancel_reason && (
            <div className="col-span-2 md:col-span-4">
              <dt className="text-muted-foreground text-xs mb-1">취소 사유</dt>
              <dd className="text-destructive">{(gr as any).cancel_reason}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* 입고 라인 */}
      <section>
        <h3 className="font-heading font-semibold text-[15px] mb-3">입고 품목</h3>
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-background/50">
                <TableHead>코드</TableHead>
                <TableHead>품목명</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead className="text-right">단가</TableHead>
                <TableHead className="text-right">금액</TableHead>
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
                  <TableCell className="font-data text-right">{formatUnitPrice(line.unit_price)}</TableCell>
                  <TableCell className="font-data text-right">
                    {formatAmount(Number(line.quantity) * Number(line.unit_price))}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-background/30">
                <TableCell colSpan={4} className="text-right text-xs font-medium text-text-secondary">
                  합계
                </TableCell>
                <TableCell className="font-data font-medium text-right">
                  {formatAmount(totalAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* 하단 액션 */}
      <div className="flex justify-between mt-4">
        <Button variant="outline" render={<Link href="/goods-receipts" />}>
          목록으로
        </Button>
        <Button variant="outline" render={<Link href="/inventory" />}>
          재고 현황 확인 →
        </Button>
      </div>
    </div>
  )
}
