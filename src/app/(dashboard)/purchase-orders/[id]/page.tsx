'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api/error'
import { PackageCheck, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { formatAmount, formatUnitPrice, formatQty, formatDate, formatPercent } from '@/lib/format'
import { usePurchaseOrder, useUpdatePurchaseOrderStatus } from '@/hooks/use-purchase-orders'
import { useGoodsReceiptsByPo } from '@/hooks/use-goods-receipts'
import { usePoPaymentsByPo, useCreatePoPayment } from '@/hooks/use-po-payments'

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = useState('lines')
  const { data: po, isLoading } = usePurchaseOrder(id)
  const updateStatus = useUpdatePurchaseOrderStatus()

  const handleConfirm = async () => {
    try {
      await updateStatus.mutateAsync({ id, status: 'confirmed', expectedStatus: 'draft' })
      toast.success('발주서 확정 완료')
    } catch (err) {
      toast.error(extractErrorMessage(err, '상태 변경 실패'))
    }
  }

  const handleCancel = async () => {
    if (!confirm('이 발주서를 취소하시겠습니까?')) return
    try {
      await updateStatus.mutateAsync({ id, status: 'cancelled', expectedStatus: po?.status ?? 'draft' })
      toast.success('발주서 취소 완료')
    } catch (err) {
      toast.error(extractErrorMessage(err, '상태 변경 실패'))
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="발주서 상세" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      </div>
    )
  }

  if (!po) return <div className="text-center py-16 text-muted-foreground">발주서를 찾을 수 없습니다</div>

  const canConfirm = po.status === 'draft'
  const canReceive = po.status === 'confirmed' || po.status === 'partially_received'
  const canCancel = po.status === 'draft'

  return (
    <div>
      <PageHeader title={po.po_number}>
        {canConfirm && (
          <Button size="sm" onClick={handleConfirm} disabled={updateStatus.isPending}
            className="bg-info hover:bg-info/80">
            확정
          </Button>
        )}
        {canReceive && (
          <Button render={<Link href={`/goods-receipts/new?po=${id}`} />} size="sm" className="bg-primary hover:bg-primary-hover">
              <PackageCheck className="h-4 w-4 mr-1" />입고 처리
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" size="sm" onClick={handleCancel}
            disabled={updateStatus.isPending} className="text-destructive">
            취소
          </Button>
        )}
      </PageHeader>

      {/* PO 헤더 정보 */}
      <section className="pb-6 mb-6 border-b border-border">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs mb-1">상태</dt>
            <dd><StatusBadge status={po.status} /></dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">공급업체</dt>
            <dd className="font-medium">{(po as any).vendor?.name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">발주일</dt>
            <dd className="font-data">{formatDate(po.order_date)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">예상입고일</dt>
            <dd className="font-data">{formatDate(po.expected_date)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">총 금액</dt>
            <dd className="font-data font-medium">{formatAmount(po.total_amount)}</dd>
          </div>
          {po.notes && (
            <div className="col-span-2 md:col-span-3">
              <dt className="text-muted-foreground text-xs mb-1">비고</dt>
              <dd>{po.notes}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* 탭: 발주내역 | 입고이력 | 지급이력 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lines">발주내역</TabsTrigger>
          <TabsTrigger value="receipts">입고이력</TabsTrigger>
          <TabsTrigger value="payments">지급이력</TabsTrigger>
        </TabsList>

        <TabsContent value="lines">
          <div className="pt-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background/50">
                    <TableHead>계약일자</TableHead>
                    <TableHead>계약번호</TableHead>
                    <TableHead>업체명</TableHead>
                    <TableHead>매입품</TableHead>
                    <TableHead>구분</TableHead>
                    <TableHead className="text-right">수량</TableHead>
                    <TableHead className="text-right">단가</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(po as any).purchase_order_lines?.map((line: any) => {
                    const isExpense = line.line_type === 'expense'
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="font-data">{formatDate(po.order_date)}</TableCell>
                        <TableCell className="font-data font-medium">{po.po_number}</TableCell>
                        <TableCell>{(po as any).vendor?.name ?? '-'}</TableCell>
                        <TableCell>{isExpense ? (line.description || '-') : (line.item?.name ?? '-')}</TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-0.5 rounded-sm text-2xs font-medium ${
                            isExpense
                              ? 'bg-warning/10 text-warning'
                              : 'bg-secondary/10 text-secondary'
                          }`}>
                            {isExpense ? '비용' : '재고'}
                          </span>
                        </TableCell>
                        <TableCell className="font-data text-right">
                          {isExpense ? '—' : formatQty(line.ordered_qty, line.item?.unit)}
                        </TableCell>
                        <TableCell className="font-data text-right">
                          {isExpense ? '—' : formatUnitPrice(line.unit_price)}
                        </TableCell>
                        <TableCell className="font-data text-right">{formatAmount(line.line_amount)}</TableCell>
                      </TableRow>
                    )
                  })}
                  {/* 합계 행 */}
                  <TableRow className="bg-background/30">
                    <TableCell colSpan={7} className="text-right text-xs font-medium text-text-secondary">
                      합계
                    </TableCell>
                    <TableCell className="font-data font-medium text-right">
                      {formatAmount(po.total_amount)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
          </div>
        </TabsContent>

        <TabsContent value="receipts">
          <ReceiptsTab poId={id} />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsTab poId={id} totalAmount={po.total_amount} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 입고이력 탭
function ReceiptsTab({ poId }: { poId: string }) {
  const { data: receipts, isLoading } = useGoodsReceiptsByPo(poId)

  if (isLoading) return <Skeleton className="h-40 w-full" />

  return (
    <div className="pt-2">
      {!receipts || receipts.length === 0 ? (
        <div className="text-center py-12">
          <PackageCheck className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">아직 입고된 내역이 없습니다</p>
          <p className="text-xs text-text-muted mt-1">발주서를 확정한 후 입고 처리를 진행할 수 있습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {receipts.map((gr: any) => (
            <div key={gr.id} className="border border-border rounded-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-data font-medium">{gr.receipt_number}</span>
                    <span className="text-text-secondary">{formatDate(gr.receipt_date)}</span>
                    <span className="text-text-secondary">{gr.warehouse?.name}</span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background/50">
                      <TableHead>품목</TableHead>
                      <TableHead className="text-right">수량</TableHead>
                      <TableHead className="text-right">단가</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gr.goods_receipt_lines?.map((line: any) => (
                      <TableRow key={line.id} className="h-8">
                        <TableCell>{line.item?.name}</TableCell>
                        <TableCell className="font-data text-right">
                          {formatQty(line.quantity, line.item?.unit)}
                        </TableCell>
                        <TableCell className="font-data text-right">
                          {formatUnitPrice(line.unit_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </div>
  )
}

// 지급이력 탭
function PaymentsTab({ poId, totalAmount }: { poId: string; totalAmount: number }) {
  const { data: payments, isLoading } = usePoPaymentsByPo(poId)
  const createPayment = useCreatePoPayment()
  const [showForm, setShowForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: '',
    notes: '',
  })

  const paidTotal = Math.round((payments?.reduce((sum: number, p: any) => sum + p.amount, 0) ?? 0) * 100) / 100
  const remaining = Math.round((totalAmount - paidTotal) * 100) / 100
  const paymentRate = totalAmount > 0 ? Math.round((paidTotal / totalAmount) * 10000) / 100 : 0

  const handleSubmit = async () => {
    if (paymentForm.amount <= 0) { toast.error('금액을 입력해주세요'); return }
    if (paymentForm.amount > remaining) { toast.error(`잔액(${formatAmount(remaining)})을 초과할 수 없습니다`); return }
    try {
      await createPayment.mutateAsync({ po_id: poId, ...paymentForm })
      toast.success('지급 등록 완료')
      setShowForm(false)
      setPaymentForm({ payment_date: new Date().toISOString().split('T')[0], amount: 0, payment_method: '', notes: '' })
    } catch (err) {
      toast.error(extractErrorMessage(err, '지급 등록 실패'))
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />

  return (
    <div className="pt-2">
      {/* 지급 요약 */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground">총 금액: </span>
            <span className="font-data font-medium">{formatAmount(totalAmount)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">누적 지급: </span>
            <span className="font-data font-medium text-secondary">{formatAmount(paidTotal)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">잔액: </span>
            <span className="font-data font-medium text-destructive">{formatAmount(remaining)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">지급율: </span>
            <span className="font-data">{formatPercent(paymentRate)}</span>
          </div>
          <div className="flex-1" />
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary-hover">
            <CreditCard className="h-4 w-4 mr-1" />지급 등록
          </Button>
        </div>

        {/* 지급 등록 폼 */}
        {showForm && (
          <div className="border border-border rounded-md p-4 mb-4 bg-background/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">지급일</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">금액</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  className="h-8 font-data"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">지급 방법</Label>
                <Input
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))}
                  placeholder="계좌이체, 카드 등"
                  className="h-8"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button size="sm" onClick={handleSubmit} disabled={createPayment.isPending}
                  className="bg-primary hover:bg-primary-hover">
                  {createPayment.isPending ? '등록 중...' : '등록'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button>
              </div>
            </div>
          </div>
        )}

        {/* 지급 목록 */}
        {!payments || payments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">아직 지급된 내역이 없습니다</p>
            <p className="text-xs text-text-muted mt-1">위의 "지급 등록" 버튼으로 지급 내역을 추가하세요</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-background/50">
                <TableHead>지급일</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>방법</TableHead>
                <TableHead>비고</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-data">{formatDate(p.payment_date)}</TableCell>
                  <TableCell className="font-data text-right">{formatAmount(p.amount)}</TableCell>
                  <TableCell className="text-text-secondary">{p.payment_method || '-'}</TableCell>
                  <TableCell className="text-text-secondary">{p.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
  )
}
