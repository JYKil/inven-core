'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { poCreateSchema, type PoCreate } from '@/lib/validations/purchase-order'
import { formatAmount } from '@/lib/format'
import { useCreatePurchaseOrder } from '@/hooks/use-purchase-orders'
import { usePartners } from '@/hooks/use-partners'
import { useItemSearch } from '@/hooks/use-items'

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const createPO = useCreatePurchaseOrder()
  const { data: partnersData } = usePartners({ partnerType: 'supplier', pageSize: 100 })
  // both 유형도 포함
  const { data: bothData } = usePartners({ partnerType: 'both', pageSize: 100 })
  const suppliers = [...(partnersData?.data ?? []), ...(bothData?.data ?? [])]

  const supplierItemsMap = useMemo(() => {
    const map: Record<string, string> = {}
    suppliers.forEach((p) => { map[p.id] = p.name })
    return map
  }, [suppliers])

  const [itemSearch, setItemSearch] = useState('')
  const { data: itemResults } = useItemSearch(itemSearch)

  const form = useForm<PoCreate>({
    resolver: zodResolver(poCreateSchema),
    defaultValues: {
      po_number: '',
      partner_id: '',
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
  const totalAmount = watchLines.reduce((sum, l) => sum + (l.ordered_qty || 0) * (l.unit_price || 0), 0)

  const addLine = (item: { id: string; code: string; name: string }) => {
    if (watchLines.some((l) => l.item_id === item.id)) {
      toast.error('이미 추가된 품목입니다')
      return
    }
    append({ item_id: item.id, ordered_qty: 1, unit_price: 0 })
    setItemSearch('')
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await createPO.mutateAsync(data)
      toast.success(`발주서 ${result.po_number} 생성 완료`)
      router.push(`/purchase-orders/${result.id}`)
    } catch (err) {
      toast.error(extractErrorMessage(err, '생성 실패'))
    }
  })

  // 품목명 표시를 위한 맵 (간단 캐시)
  const [itemNames, setItemNames] = useState<Record<string, string>>({})

  const addLineWithName = (item: { id: string; code: string; name: string }) => {
    setItemNames((prev) => ({ ...prev, [item.id]: `${item.code} — ${item.name}` }))
    addLine(item)
  }

  return (
    <div>
      <PageHeader title="발주서 생성" />
      <form onSubmit={onSubmit}>
        <Card className="border-border">
          <CardContent className="pt-6 space-y-6">
            {/* 헤더 정보 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-1.5">
                <Label htmlFor="po_number">PO 번호 *</Label>
                <Input id="po_number" {...form.register('po_number')} placeholder="PO-2026-001" />
                {form.formState.errors.po_number && (
                  <p className="text-xs text-destructive">{form.formState.errors.po_number.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>공급업체 *</Label>
                <Select
                  value={form.watch('partner_id') || undefined}
                  onValueChange={(v) => v && form.setValue('partner_id', v)}
                  items={supplierItemsMap}
                >
                  <SelectTrigger><SelectValue placeholder="공급업체 선택" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.partner_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.partner_id.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order_date">발주일 *</Label>
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
                <h2 className="font-heading font-semibold text-[15px]">발주 품목</h2>
              </div>

              {/* 품목 검색 + 추가 */}
              <div className="relative mb-3 max-w-md">
                <Input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="품목 검색하여 추가..."
                  className="h-9"
                />
                {itemSearch && itemResults && itemResults.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-[6px] shadow-md max-h-48 overflow-auto">
                    {itemResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-background flex justify-between"
                        onClick={() => addLineWithName(item)}
                      >
                        <span className="font-data">{item.code}</span>
                        <span className="text-text-secondary">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {form.formState.errors.lines?.root && (
                <p className="text-xs text-destructive mb-2">{form.formState.errors.lines.root.message}</p>
              )}

              {fields.length > 0 && (
                <div className="border border-border rounded-[8px] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-background/50">
                        <TableHead>품목</TableHead>
                        <TableHead className="w-32">수량</TableHead>
                        <TableHead className="w-36">단가</TableHead>
                        <TableHead className="w-36 text-right">금액</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, idx) => {
                        const qty = watchLines[idx]?.ordered_qty || 0
                        const price = watchLines[idx]?.unit_price || 0
                        return (
                          <TableRow key={field.id}>
                            <TableCell>
                              {itemNames[watchLines[idx]?.item_id] || watchLines[idx]?.item_id}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="any"
                                min="0.0001"
                                {...form.register(`lines.${idx}.ordered_qty`, { valueAsNumber: true })}
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
                            <TableCell className="font-data text-right">
                              {formatAmount(qty * price)}
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
                        <TableCell colSpan={3} className="text-right text-xs font-medium text-text-secondary">
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
                {createPO.isPending ? '생성 중...' : '발주서 생성'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
