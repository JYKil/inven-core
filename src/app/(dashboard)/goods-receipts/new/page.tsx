'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/common/page-header'
import { goodsReceiptCreateSchema, type GoodsReceiptCreate } from '@/lib/validations/goods-receipt'
import { formatQty } from '@/lib/format'
import { useExecuteGoodsReceipt } from '@/hooks/use-goods-receipts'
import { usePurchaseOrder } from '@/hooks/use-purchase-orders'
import { useWarehouses } from '@/hooks/use-warehouses'
import { useItemSearch } from '@/hooks/use-items'

export default function NewGoodsReceiptPage() {
  return (
    <Suspense fallback={<div className="p-6">로딩 중...</div>}>
      <NewGoodsReceiptContent />
    </Suspense>
  )
}

function NewGoodsReceiptContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const poId = searchParams.get('po') ?? undefined

  const executeGR = useExecuteGoodsReceipt()
  const { data: po } = usePurchaseOrder(poId ?? '')
  const { data: warehousesData } = useWarehouses({ pageSize: 100 })
  const warehouses = warehousesData?.data ?? []

  const [itemSearch, setItemSearch] = useState('')
  const { data: itemResults } = useItemSearch(itemSearch)
  const [itemNames, setItemNames] = useState<Record<string, string>>({})

  const form = useForm<GoodsReceiptCreate>({
    resolver: zodResolver(goodsReceiptCreateSchema),
    defaultValues: {
      receipt_number: '',
      po_id: poId,
      warehouse_id: '',
      receipt_date: new Date().toISOString().split('T')[0],
      notes: '',
      lines: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  })

  // PO에서 진입 시 라인 자동 채움
  useEffect(() => {
    if (!po || fields.length > 0) return
    const poLines = (po as any).purchase_order_lines ?? []
    const newLines = poLines
      .filter((l: any) => l.received_qty < l.ordered_qty)
      .map((l: any) => {
        const remaining = l.ordered_qty - l.received_qty
        setItemNames((prev) => ({ ...prev, [l.item_id]: `${l.item?.code} — ${l.item?.name}` }))
        return {
          po_line_id: l.id,
          item_id: l.item_id,
          quantity: remaining,
          unit_price: l.unit_price,
        }
      })
    if (newLines.length > 0) {
      form.setValue('lines', newLines)
    }
  }, [po]) // eslint-disable-line react-hooks/exhaustive-deps

  const addLine = (item: { id: string; code: string; name: string }) => {
    setItemNames((prev) => ({ ...prev, [item.id]: `${item.code} — ${item.name}` }))
    append({ item_id: item.id, quantity: 1, unit_price: 0 })
    setItemSearch('')
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await executeGR.mutateAsync(data)
      toast.success(`${data.lines.length}개 품목 입고 완료`)
      if (poId) {
        router.push(`/purchase-orders/${poId}`)
      } else {
        router.push('/goods-receipts')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '입고 처리 실패')
    }
  })

  const watchLines = form.watch('lines')

  return (
    <div>
      <PageHeader title="입고 등록" />
      <form onSubmit={onSubmit}>
        <Card className="border-[#E0D8CF]">
          <CardContent className="pt-6 space-y-6">
            {/* 헤더 */}
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-1.5">
                <Label>입고번호 *</Label>
                <Input {...form.register('receipt_number')} placeholder="GR-2026-001" />
                {form.formState.errors.receipt_number && (
                  <p className="text-xs text-[#B83A2A]">{form.formState.errors.receipt_number.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>입고 창고 *</Label>
                <Select
                  value={form.watch('warehouse_id') || undefined}
                  onValueChange={(v) => v && form.setValue('warehouse_id', v)}
                >
                  <SelectTrigger><SelectValue placeholder="창고 선택" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.code} — {wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.warehouse_id && (
                  <p className="text-xs text-[#B83A2A]">{form.formState.errors.warehouse_id.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>입고일 *</Label>
                <Input type="date" {...form.register('receipt_date')} />
              </div>
              {poId && (
                <div className="space-y-1.5">
                  <Label>연결 PO</Label>
                  <Input value={(po as any)?.po_number ?? poId} disabled className="bg-[#F5F0EB]" />
                </div>
              )}
              <div className="col-span-2 space-y-1.5">
                <Label>비고</Label>
                <Textarea {...form.register('notes')} rows={2} />
              </div>
            </div>

            {/* 입고 라인 */}
            <div>
              <h2 className="font-heading font-semibold text-[15px] mb-3">입고 품목</h2>

              {!poId && (
                <div className="relative mb-3 max-w-md">
                  <Input
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="품목 검색하여 추가..."
                    className="h-9"
                  />
                  {itemSearch && itemResults && itemResults.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-white border border-[#E0D8CF] rounded-[6px] shadow-md max-h-48 overflow-auto">
                      {itemResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5F0EB] flex justify-between"
                          onClick={() => addLine(item)}
                        >
                          <span className="font-data">{item.code}</span>
                          <span className="text-[#6B6158]">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {form.formState.errors.lines?.root && (
                <p className="text-xs text-[#B83A2A] mb-2">{form.formState.errors.lines.root.message}</p>
              )}

              {fields.length > 0 && (
                <div className="border border-[#E0D8CF] rounded-[8px] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F5F0EB]/50">
                        <TableHead className="text-xs">품목</TableHead>
                        <TableHead className="text-xs w-32">수량</TableHead>
                        <TableHead className="text-xs w-36">단가</TableHead>
                        <TableHead className="text-xs w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, idx) => (
                        <TableRow key={field.id} className="h-9">
                          <TableCell className="text-[13px]">
                            {itemNames[watchLines[idx]?.item_id] || watchLines[idx]?.item_id}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="any"
                              min="0.0001"
                              {...form.register(`lines.${idx}.quantity`, { valueAsNumber: true })}
                              className="h-8 w-24 font-data text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              {...form.register(`lines.${idx}.unit_price`, { valueAsNumber: true })}
                              className="h-8 w-28 font-data text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            {!poId && (
                              <Button variant="ghost" size="sm" type="button" onClick={() => remove(idx)}>
                                <X className="h-4 w-4 text-[#B83A2A]" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
              <Button type="submit" disabled={executeGR.isPending} className="bg-[#D4642A] hover:bg-[#BF5520]">
                {executeGR.isPending ? '입고 처리 중...' : '입고 실행'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
