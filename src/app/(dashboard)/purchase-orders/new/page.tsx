'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api/error'
import { Plus, X } from 'lucide-react'
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
import { formatAmount } from '@/lib/format'
import { useCreatePurchaseOrder } from '@/hooks/use-purchase-orders'
import { useVendors } from '@/hooks/use-vendors'
import { useItemSearch } from '@/hooks/use-items'

type LineInput = {
  line_type: 'inventory' | 'expense'
  item_id?: string
  description?: string
  ordered_qty: number
  unit_price: number
  line_amount: number
}

type FormValues = {
  po_number: string
  vendor_id: string
  order_date: string
  expected_date: string
  notes: string
  lines: LineInput[]
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const createPO = useCreatePurchaseOrder()
  const { data: vendorsData } = useVendors({ pageSize: 100 })
  const vendors = vendorsData?.data ?? []

  const vendorItemsMap = useMemo(() => {
    const map: Record<string, string> = {}
    vendors.forEach((v) => { map[v.id] = v.name })
    return map
  }, [vendors])

  const [itemSearch, setItemSearch] = useState('')
  const { data: itemResults } = useItemSearch(itemSearch)

  const form = useForm<FormValues>({
    defaultValues: {
      po_number: '',
      vendor_id: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_date: '',
      notes: '',
      lines: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  })

  const watchLines = form.watch('lines')

  // 합계 계산: 재고는 qty*price, 비용은 line_amount
  const totalAmount = watchLines.reduce((sum, l) => {
    if (l.line_type === 'expense') return sum + (l.line_amount || 0)
    return sum + (l.ordered_qty || 0) * (l.unit_price || 0)
  }, 0)

  // 재고 품목 추가
  const [itemNames, setItemNames] = useState<Record<string, string>>({})
  const addInventoryLine = (item: { id: string; code: string; name: string }) => {
    if (watchLines.some((l) => l.line_type === 'inventory' && l.item_id === item.id)) {
      toast.error('이미 추가된 품목입니다')
      return
    }
    setItemNames((prev) => ({ ...prev, [item.id]: `${item.code} — ${item.name}` }))
    append({ line_type: 'inventory', item_id: item.id, description: '', ordered_qty: 1, unit_price: 0, line_amount: 0 })
    setItemSearch('')
  }

  // 비용 라인 추가
  const addExpenseLine = () => {
    append({ line_type: 'expense', item_id: '', description: '', ordered_qty: 0, unit_price: 0, line_amount: 0 })
  }

  const onSubmit = form.handleSubmit(async (data) => {
    if (data.lines.length === 0) {
      toast.error('최소 1개의 품목 또는 비용을 추가해주세요')
      return
    }
    // 비용 라인 검증
    for (const line of data.lines) {
      if (line.line_type === 'expense' && (!line.description || line.description.trim() === '')) {
        toast.error('비용 라인의 매입품명을 입력해주세요')
        return
      }
      if (line.line_type === 'expense' && (!line.line_amount || line.line_amount <= 0)) {
        toast.error('비용 라인의 금액을 입력해주세요')
        return
      }
      if (line.line_type === 'inventory' && (!line.ordered_qty || line.ordered_qty <= 0)) {
        toast.error('재고 라인의 수량을 입력해주세요')
        return
      }
    }
    if (!data.vendor_id) {
      toast.error('업체를 선택해주세요')
      return
    }
    if (!data.po_number) {
      toast.error('계약번호를 입력해주세요')
      return
    }

    try {
      const result = await createPO.mutateAsync({
        po_number: data.po_number,
        vendor_id: data.vendor_id,
        order_date: data.order_date,
        expected_date: data.expected_date || undefined,
        notes: data.notes || undefined,
        lines: data.lines.map((l) => ({
          line_type: l.line_type,
          item_id: l.line_type === 'inventory' ? l.item_id : undefined,
          description: l.line_type === 'expense' ? l.description : undefined,
          ordered_qty: l.line_type === 'inventory' ? l.ordered_qty : undefined,
          unit_price: l.line_type === 'inventory' ? l.unit_price : undefined,
          line_amount: l.line_type === 'expense' ? l.line_amount : undefined,
        })),
      })
      toast.success(`발주 ${result.po_number} 등록 완료`)
      router.push(`/purchase-orders/${result.id}`)
    } catch (err) {
      toast.error(extractErrorMessage(err, '등록 실패'))
    }
  })

  return (
    <div>
      <PageHeader title="발주 등록" />
      <form onSubmit={onSubmit}>
        <Card className="border-border">
          <CardContent className="pt-6 space-y-6">
            {/* 헤더 정보 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-1.5">
                <Label htmlFor="po_number">계약번호 *</Label>
                <Input id="po_number" {...form.register('po_number')} placeholder="PO-2026-001" />
              </div>
              <div className="space-y-1.5">
                <Label>업체명 *</Label>
                <Select
                  value={form.watch('vendor_id') || undefined}
                  onValueChange={(v) => v && form.setValue('vendor_id', v)}
                  items={vendorItemsMap}
                >
                  <SelectTrigger><SelectValue placeholder="업체 선택" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order_date">계약일자 *</Label>
                <Input id="order_date" type="date" {...form.register('order_date')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expected_date">예상 입고일</Label>
                <Input id="expected_date" type="date" {...form.register('expected_date')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="po_notes">비고</Label>
                <Textarea id="po_notes" {...form.register('notes')} rows={2} />
              </div>
            </div>

            {/* 라인 입력 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-h3">매입품</h2>
                <Button type="button" variant="outline" size="sm" onClick={addExpenseLine}>
                  + 비용 추가
                </Button>
              </div>

              {/* 품목 검색 + 추가 */}
              <div className="relative mb-3 max-w-md">
                <Input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="재고 품목 검색하여 추가..."
                  className="h-9"
                />
                {itemSearch && itemResults && itemResults.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-auto">
                    {itemResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-background flex justify-between"
                        onClick={() => addInventoryLine(item)}
                      >
                        <span className="font-data">{item.code}</span>
                        <span className="text-text-secondary">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {fields.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-background/50">
                        <TableHead>구분</TableHead>
                        <TableHead>매입품</TableHead>
                        <TableHead className="w-32">수량</TableHead>
                        <TableHead className="w-36">단가</TableHead>
                        <TableHead className="w-36 text-right">금액</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, idx) => {
                        const line = watchLines[idx]
                        const isExpense = line?.line_type === 'expense'
                        const lineAmount = isExpense
                          ? (line?.line_amount || 0)
                          : (line?.ordered_qty || 0) * (line?.unit_price || 0)

                        return (
                          <TableRow key={field.id}>
                            <TableCell>
                              <span className={`inline-block px-2 py-0.5 rounded-sm text-2xs font-medium ${
                                isExpense
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-secondary/10 text-secondary'
                              }`}>
                                {isExpense ? '비용' : '재고'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {isExpense ? (
                                <Input
                                  {...form.register(`lines.${idx}.description`)}
                                  placeholder="매입품명 (예: 수수료)"
                                  className="h-8 text-sm"
                                />
                              ) : (
                                itemNames[line?.item_id ?? ''] || line?.item_id || '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {isExpense ? (
                                <span className="text-text-secondary text-sm">—</span>
                              ) : (
                                <Input
                                  type="number"
                                  step="any"
                                  min="0.0001"
                                  {...form.register(`lines.${idx}.ordered_qty`, { valueAsNumber: true })}
                                  className="h-8 w-24 font-data text-sm"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {isExpense ? (
                                <span className="text-text-secondary text-sm">—</span>
                              ) : (
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  {...form.register(`lines.${idx}.unit_price`, { valueAsNumber: true })}
                                  className="h-8 w-28 font-data text-sm"
                                />
                              )}
                            </TableCell>
                            <TableCell className="font-data text-right">
                              {isExpense ? (
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  {...form.register(`lines.${idx}.line_amount`, { valueAsNumber: true })}
                                  className="h-8 w-28 font-data text-sm text-right"
                                />
                              ) : (
                                formatAmount(lineAmount)
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" type="button" onClick={() => remove(idx)}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      <TableRow className="bg-background/30">
                        <TableCell colSpan={4} className="text-right text-xs font-medium text-text-secondary">
                          합계
                        </TableCell>
                        <TableCell className="font-data font-medium text-right">
                          {formatAmount(totalAmount)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
              <Button type="submit" disabled={createPO.isPending} className="bg-primary hover:bg-primary-hover">
                {createPO.isPending ? '등록 중...' : '발주 등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
