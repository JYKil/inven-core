'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api/error'
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
import { warehouseTransferCreateSchema, type WarehouseTransferCreate } from '@/lib/validations/warehouse-transfer'
import { formatQty } from '@/lib/format'
import { useExecuteTransfer } from '@/hooks/use-warehouse-transfers'
import { useWarehouses } from '@/hooks/use-warehouses'
import { useItemSearch } from '@/hooks/use-items'

export default function NewWarehouseTransferPage() {
  const router = useRouter()
  const executeTransfer = useExecuteTransfer()
  const { data: warehousesData } = useWarehouses({ pageSize: 100 })
  const warehouses = warehousesData?.data ?? []

  const warehouseItemsMap = useMemo(() => {
    const map: Record<string, string> = {}
    warehouses.forEach((w) => { map[w.id] = w.name })
    return map
  }, [warehouses])

  const [itemSearch, setItemSearch] = useState('')
  const { data: itemResults } = useItemSearch(itemSearch)

  const form = useForm<WarehouseTransferCreate>({
    resolver: zodResolver(warehouseTransferCreateSchema),
    defaultValues: {
      from_warehouse_id: '',
      to_warehouse_id: '',
      transfer_date: new Date().toISOString().split('T')[0],
      notes: '',
      lines: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  })

  const watchLines = form.watch('lines')

  // 품목명 표시를 위한 맵
  const [itemNames, setItemNames] = useState<Record<string, { display: string; unit: string }>>({})

  const addLine = (item: { id: string; code: string; name: string; unit?: string }) => {
    if (watchLines.some((l) => l.item_id === item.id)) {
      toast.error('이미 추가된 품목입니다')
      return
    }
    setItemNames((prev) => ({
      ...prev,
      [item.id]: { display: `${item.code} — ${item.name}`, unit: item.unit ?? 'EA' },
    }))
    append({ item_id: item.id, quantity: 1 })
    setItemSearch('')
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await executeTransfer.mutateAsync(data)
      toast.success(`${data.lines.length}개 품목 이동 완료`)
      router.push('/warehouse-transfers')
    } catch (err) {
      toast.error(extractErrorMessage(err, '이동 실패'))
    }
  })

  return (
    <div>
      <PageHeader title="창고 이동 생성" />
      <form onSubmit={onSubmit}>
        <Card className="border-border">
          <CardContent className="pt-6 space-y-6">
            {/* 헤더 정보 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-1.5">
                <Label>출발 창고 *</Label>
                <Select
                  value={form.watch('from_warehouse_id') || undefined}
                  onValueChange={(v) => v && form.setValue('from_warehouse_id', v)}
                  items={warehouseItemsMap}
                >
                  <SelectTrigger><SelectValue placeholder="출발 창고 선택" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.from_warehouse_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.from_warehouse_id.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>도착 창고 *</Label>
                <Select
                  value={form.watch('to_warehouse_id') || undefined}
                  onValueChange={(v) => v && form.setValue('to_warehouse_id', v)}
                  items={warehouseItemsMap}
                >
                  <SelectTrigger><SelectValue placeholder="도착 창고 선택" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.to_warehouse_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.to_warehouse_id.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="transfer_date">이동일 *</Label>
                <Input id="transfer_date" type="date" {...form.register('transfer_date')} />
              </div>
              <div />
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="transfer_notes">비고</Label>
                <Textarea id="transfer_notes" {...form.register('notes')} rows={2} />
              </div>
            </div>

            {/* 라인 입력 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-h3">이동 품목</h2>
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
                  <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-auto">
                    {itemResults.map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-background flex justify-between"
                        onClick={() => addLine(item)}
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
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-background/50">
                        <TableHead>품목</TableHead>
                        <TableHead className="w-32">수량</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, idx) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            {itemNames[watchLines[idx]?.item_id]?.display || watchLines[idx]?.item_id}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="any"
                              min="0.0001"
                              {...form.register(`lines.${idx}.quantity`, { valueAsNumber: true })}
                              className="h-8 w-28 font-data text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" type="button" onClick={() => remove(idx)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
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
              <Button type="submit" disabled={executeTransfer.isPending} className="bg-primary hover:bg-primary-hover">
                {executeTransfer.isPending ? '처리 중...' : '이동 실행'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
