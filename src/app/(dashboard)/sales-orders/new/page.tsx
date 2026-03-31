'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import { salesOrderCreateSchema, type SalesOrderCreate } from '@/lib/validations/sales-order'
import { formatAmount } from '@/lib/format'
import { useCreateSalesOrder } from '@/hooks/use-sales-orders'
import { usePartners } from '@/hooks/use-partners'
import { useItemSearch } from '@/hooks/use-items'
import { useWarehouses } from '@/hooks/use-warehouses'

export default function NewSalesOrderPage() {
  const router = useRouter()
  const createSO = useCreateSalesOrder()
  // 고객 거래처 조회 (customer + both)
  const { data: customersData } = usePartners({ partnerType: 'customer', pageSize: 100 })
  const { data: bothData } = usePartners({ partnerType: 'both', pageSize: 100 })
  const customers = [...(customersData?.data ?? []), ...(bothData?.data ?? [])]

  const customerItemsMap = useMemo(() => {
    const map: Record<string, string> = {}
    customers.forEach((p) => { map[p.id] = p.name })
    return map
  }, [customers])

  const { data: warehousesData } = useWarehouses({ pageSize: 100 })
  const warehouses = warehousesData?.data ?? []
  const warehouseItemsMap = useMemo(() => {
    const map: Record<string, string> = {}
    warehouses.forEach((w) => { map[w.id] = `${w.code} — ${w.name}` })
    return map
  }, [warehouses])

  const [itemSearch, setItemSearch] = useState('')
  const { data: itemResults } = useItemSearch(itemSearch)

  const form = useForm<SalesOrderCreate>({
    resolver: zodResolver(salesOrderCreateSchema),
    defaultValues: {
      order_number: '',
      partner_id: '',
      order_date: new Date().toISOString().split('T')[0],
      notes: '',
      lines: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  })

  const watchLines = form.watch('lines')
  const totalAmount = watchLines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unit_price || 0), 0)

  // 품목명 표시를 위한 맵
  const [itemNames, setItemNames] = useState<Record<string, string>>({})

  const addLine = (item: { id: string; code: string; name: string }) => {
    if (watchLines.some((l) => l.item_id === item.id)) {
      toast.error('이미 추가된 품목입니다')
      return
    }
    setItemNames((prev) => ({ ...prev, [item.id]: `${item.code} — ${item.name}` }))
    append({
      item_id: item.id,
      warehouse_id: warehouses.length === 1 ? warehouses[0].id : '',
      quantity: 1,
      unit_price: 0,
    })
    setItemSearch('')
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await createSO.mutateAsync(data)
      toast.success(`판매주문 ${result.order_number} 생성 완료`)
      router.push(`/sales-orders/${result.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '생성 실패')
    }
  })

  return (
    <div>
      <PageHeader title="판매 주문 생성" />
      <form onSubmit={onSubmit}>
        <Card className="border-[#E0D8CF]">
          <CardContent className="pt-6 space-y-6">
            {/* 헤더 정보 */}
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-1.5">
                <Label>주문번호 *</Label>
                <Input {...form.register('order_number')} placeholder="SO-2026-001" />
                {form.formState.errors.order_number && (
                  <p className="text-xs text-[#B83A2A]">{form.formState.errors.order_number.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>거래처 *</Label>
                <Select
                  value={form.watch('partner_id') || undefined}
                  onValueChange={(v) => v && form.setValue('partner_id', v)}
                  items={customerItemsMap}
                >
                  <SelectTrigger><SelectValue placeholder="거래처 선택" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.partner_id && (
                  <p className="text-xs text-[#B83A2A]">{form.formState.errors.partner_id.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>주문일 *</Label>
                <Input type="date" {...form.register('order_date')} />
              </div>
              <div />
              <div className="col-span-2 space-y-1.5">
                <Label>비고</Label>
                <Textarea {...form.register('notes')} rows={2} />
              </div>
            </div>

            {/* 라인 입력 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-[15px]">판매 품목</h2>
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

              {form.formState.errors.lines?.root && (
                <p className="text-xs text-[#B83A2A] mb-2">{form.formState.errors.lines.root.message}</p>
              )}

              {fields.length > 0 && (
                <div className="border border-[#E0D8CF] rounded-[8px] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F5F0EB]/50">
                        <TableHead className="text-xs">품목</TableHead>
                        <TableHead className="text-xs w-44">출고 창고</TableHead>
                        <TableHead className="text-xs w-28">수량</TableHead>
                        <TableHead className="text-xs w-32">판매 단가</TableHead>
                        <TableHead className="text-xs w-32 text-right">금액</TableHead>
                        <TableHead className="text-xs w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, idx) => {
                        const qty = watchLines[idx]?.quantity || 0
                        const price = watchLines[idx]?.unit_price || 0
                        return (
                          <TableRow key={field.id} className="h-9">
                            <TableCell className="text-[13px]">
                              {itemNames[watchLines[idx]?.item_id] || watchLines[idx]?.item_id}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={watchLines[idx]?.warehouse_id || undefined}
                                onValueChange={(v) => v && form.setValue(`lines.${idx}.warehouse_id`, v)}
                                items={warehouseItemsMap}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="창고 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  {warehouses.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                      {w.code} — {w.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                            <TableCell className="text-[13px] font-data text-right">
                              {formatAmount(qty * price)}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" type="button" onClick={() => remove(idx)}>
                                <X className="h-4 w-4 text-[#B83A2A]" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      <TableRow className="bg-[#F5F0EB]/30">
                        <TableCell colSpan={4} className="text-right text-xs font-medium text-[#6B6158]">
                          합계
                        </TableCell>
                        <TableCell className="text-[13px] font-data font-medium text-right">
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
              <Button type="submit" disabled={createSO.isPending} className="bg-[#D4642A] hover:bg-[#BF5520]">
                {createSO.isPending ? '생성 중...' : '주문 생성'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
