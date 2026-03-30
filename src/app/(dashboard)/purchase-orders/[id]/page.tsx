'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PackageCheck, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
      await updateStatus.mutateAsync({ id, status: 'confirmed' })
      toast.success('발주서 확정 완료')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '상태 변경 실패')
    }
  }

  const handleCancel = async () => {
    if (!confirm('이 발주서를 취소하시겠습니까?')) return
    try {
      await updateStatus.mutateAsync({ id, status: 'cancelled' })
      toast.success('발주서 취소 완료')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '상태 변경 실패')
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="발주서 상세" />
        <Card className="border-[#E0D8CF]">
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!po) return <div className="text-center py-16 text-[#9C9189]">발주서를 찾을 수 없습니다</div>

  const canConfirm = po.status === 'draft'
  const canReceive = po.status === 'confirmed' || po.status === 'partially_received'
  const canCancel = po.status === 'draft'

  return (
    <div>
      <PageHeader title={po.po_number}>
        {canConfirm && (
          <Button size="sm" onClick={handleConfirm} disabled={updateStatus.isPending}
            className="bg-[#4A7B94] hover:bg-[#3d6679]">
            확정
          </Button>
        )}
        {canReceive && (
          <Button render={<Link href={`/goods-receipts/new?po=${id}`} />} size="sm" className="bg-[#D4642A] hover:bg-[#BF5520]">
              <PackageCheck className="h-4 w-4 mr-1" />입고 처리
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" size="sm" onClick={handleCancel}
            disabled={updateStatus.isPending} className="text-[#B83A2A]">
            취소
          </Button>
        )}
      </PageHeader>

      {/* PO 헤더 정보 */}
      <Card className="border-[#E0D8CF] mb-4">
        <CardContent className="pt-6">
          <dl className="grid grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-[#9C9189] text-xs mb-1">상태</dt>
              <dd><StatusBadge status={po.status} /></dd>
            </div>
            <div>
              <dt className="text-[#9C9189] text-xs mb-1">공급업체</dt>
              <dd className="font-medium">{(po as any).partner?.name ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-[#9C9189] text-xs mb-1">발주일</dt>
              <dd className="font-data">{formatDate(po.order_date)}</dd>
            </div>
            <div>
              <dt className="text-[#9C9189] text-xs mb-1">예상입고일</dt>
              <dd className="font-data">{formatDate(po.expected_date)}</dd>
            </div>
            <div>
              <dt className="text-[#9C9189] text-xs mb-1">총 금액</dt>
              <dd className="font-data font-medium">{formatAmount(po.total_amount)}</dd>
            </div>
            {po.notes && (
              <div className="col-span-3">
                <dt className="text-[#9C9189] text-xs mb-1">비고</dt>
                <dd>{po.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* 탭: 발주내역 | 입고이력 | 지급이력 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lines">발주내역</TabsTrigger>
          <TabsTrigger value="receipts">입고이력</TabsTrigger>
          <TabsTrigger value="payments">지급이력</TabsTrigger>
        </TabsList>

        <TabsContent value="lines">
          <Card className="border-[#E0D8CF]">
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F5F0EB]/50">
                    <TableHead className="text-xs">코드</TableHead>
                    <TableHead className="text-xs">품목명</TableHead>
                    <TableHead className="text-xs text-right">발주수량</TableHead>
                    <TableHead className="text-xs text-right">입고수량</TableHead>
                    <TableHead className="text-xs text-right">입고율</TableHead>
                    <TableHead className="text-xs text-right">단가</TableHead>
                    <TableHead className="text-xs text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(po as any).purchase_order_lines?.map((line: any) => {
                    const receiveRate = line.ordered_qty > 0
                      ? (line.received_qty / line.ordered_qty) * 100 : 0
                    return (
                      <TableRow key={line.id} className="h-9">
                        <TableCell className="text-[13px] font-data">{line.item?.code}</TableCell>
                        <TableCell className="text-[13px]">{line.item?.name}</TableCell>
                        <TableCell className="text-[13px] font-data text-right">
                          {formatQty(line.ordered_qty, line.item?.unit)}
                        </TableCell>
                        <TableCell className="text-[13px] font-data text-right">
                          {formatQty(line.received_qty, line.item?.unit)}
                        </TableCell>
                        <TableCell className="text-[13px] font-data text-right">
                          <span className={receiveRate >= 100 ? 'text-[#2B7A6F]' : receiveRate > 0 ? 'text-[#C4901A]' : ''}>
                            {formatPercent(receiveRate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-[13px] font-data text-right">{formatUnitPrice(line.unit_price)}</TableCell>
                        <TableCell className="text-[13px] font-data text-right">{formatAmount(line.line_amount)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
    <Card className="border-[#E0D8CF]">
      <CardContent className="pt-4">
        {!receipts || receipts.length === 0 ? (
          <p className="text-center py-8 text-sm text-[#9C9189]">입고 이력이 없습니다</p>
        ) : (
          <div className="space-y-4">
            {receipts.map((gr: any) => (
              <div key={gr.id} className="border border-[#E0D8CF] rounded-[6px] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-data font-medium">{gr.receipt_number}</span>
                    <span className="text-[#6B6158]">{formatDate(gr.receipt_date)}</span>
                    <span className="text-[#6B6158]">{gr.warehouse?.name}</span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F5F0EB]/50">
                      <TableHead className="text-xs">품목</TableHead>
                      <TableHead className="text-xs text-right">수량</TableHead>
                      <TableHead className="text-xs text-right">단가</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gr.goods_receipt_lines?.map((line: any) => (
                      <TableRow key={line.id} className="h-8">
                        <TableCell className="text-[13px]">{line.item?.name}</TableCell>
                        <TableCell className="text-[13px] font-data text-right">
                          {formatQty(line.quantity, line.item?.unit)}
                        </TableCell>
                        <TableCell className="text-[13px] font-data text-right">
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
      </CardContent>
    </Card>
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

  const paidTotal = payments?.reduce((sum: number, p: any) => sum + p.amount, 0) ?? 0
  const remaining = totalAmount - paidTotal
  const paymentRate = totalAmount > 0 ? (paidTotal / totalAmount) * 100 : 0

  const handleSubmit = async () => {
    if (paymentForm.amount <= 0) { toast.error('금액을 입력해주세요'); return }
    try {
      await createPayment.mutateAsync({ po_id: poId, ...paymentForm })
      toast.success('지급 등록 완료')
      setShowForm(false)
      setPaymentForm({ payment_date: new Date().toISOString().split('T')[0], amount: 0, payment_method: '', notes: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '지급 등록 실패')
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />

  return (
    <Card className="border-[#E0D8CF]">
      <CardContent className="pt-4">
        {/* 지급 요약 */}
        <div className="flex items-center gap-6 mb-4 text-sm">
          <div>
            <span className="text-[#9C9189]">총 금액: </span>
            <span className="font-data font-medium">{formatAmount(totalAmount)}</span>
          </div>
          <div>
            <span className="text-[#9C9189]">누적 지급: </span>
            <span className="font-data font-medium text-[#2B7A6F]">{formatAmount(paidTotal)}</span>
          </div>
          <div>
            <span className="text-[#9C9189]">잔액: </span>
            <span className="font-data font-medium text-[#B83A2A]">{formatAmount(remaining)}</span>
          </div>
          <div>
            <span className="text-[#9C9189]">지급율: </span>
            <span className="font-data">{formatPercent(paymentRate)}</span>
          </div>
          <div className="flex-1" />
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-[#D4642A] hover:bg-[#BF5520]">
            <CreditCard className="h-4 w-4 mr-1" />지급 등록
          </Button>
        </div>

        {/* 지급 등록 폼 */}
        {showForm && (
          <div className="border border-[#E0D8CF] rounded-[6px] p-4 mb-4 bg-[#F5F0EB]/30">
            <div className="grid grid-cols-4 gap-3">
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
                  className="bg-[#D4642A] hover:bg-[#BF5520]">
                  {createPayment.isPending ? '등록 중...' : '등록'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button>
              </div>
            </div>
          </div>
        )}

        {/* 지급 목록 */}
        {!payments || payments.length === 0 ? (
          <p className="text-center py-8 text-sm text-[#9C9189]">지급 이력이 없습니다</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5F0EB]/50">
                <TableHead className="text-xs">지급일</TableHead>
                <TableHead className="text-xs text-right">금액</TableHead>
                <TableHead className="text-xs">방법</TableHead>
                <TableHead className="text-xs">비고</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p: any) => (
                <TableRow key={p.id} className="h-9">
                  <TableCell className="text-[13px] font-data">{formatDate(p.payment_date)}</TableCell>
                  <TableCell className="text-[13px] font-data text-right">{formatAmount(p.amount)}</TableCell>
                  <TableCell className="text-[13px] text-[#6B6158]">{p.payment_method || '-'}</TableCell>
                  <TableCell className="text-[13px] text-[#6B6158]">{p.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
