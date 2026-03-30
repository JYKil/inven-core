'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { assemblyOrderCreateSchema, type AssemblyOrderCreate } from '@/lib/validations/assembly'
import { formatQty, formatAmount, formatUnitPrice } from '@/lib/format'
import { useExecuteAssembly, useAssemblyItems, useMaterialAvailability } from '@/hooks/use-assembly-orders'
import { useWarehouses } from '@/hooks/use-warehouses'

export default function NewAssemblyOrderPage() {
  return (
    <Suspense fallback={<div className="p-6">로딩 중...</div>}>
      <NewAssemblyContent />
    </Suspense>
  )
}

function NewAssemblyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillItemId = searchParams.get('product_item_id')
  const executeAssembly = useExecuteAssembly()
  const { data: assemblyItems, isLoading: itemsLoading } = useAssemblyItems()
  const { data: warehousesData } = useWarehouses({ pageSize: 100 })
  const warehouses = warehousesData?.data ?? []

  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [selectedBomId, setSelectedBomId] = useState<string>('')

  const form = useForm<AssemblyOrderCreate>({
    resolver: zodResolver(assemblyOrderCreateSchema),
    defaultValues: {
      order_number: '',
      bom_header_id: '',
      product_item_id: '',
      warehouse_id: '',
      quantity: 1,
      assembly_date: new Date().toISOString().split('T')[0],
    },
  })

  // URL 파라미터로 품목 자동 선택 (재조립 링크)
  useEffect(() => {
    if (prefillItemId && assemblyItems?.length && !selectedItemId) {
      const found = assemblyItems.find((i: any) => i.id === prefillItemId)
      if (found) {
        handleItemChange(prefillItemId)
      }
    }
  }, [prefillItemId, assemblyItems]) // eslint-disable-line react-hooks/exhaustive-deps

  const watchQuantity = form.watch('quantity')
  const watchWarehouseId = form.watch('warehouse_id')

  // 선택된 품목의 BOM 목록
  const selectedItem = useMemo(
    () => (assemblyItems ?? []).find((i: any) => i.id === selectedItemId),
    [assemblyItems, selectedItemId],
  )
  const activeBoms = useMemo(
    () => (selectedItem as any)?.bom_headers?.filter((b: any) => b.is_active) ?? [],
    [selectedItem],
  )

  // 재료 가용성 확인 + 예상 원가
  const { data: availabilityData, isLoading: availLoading } = useMaterialAvailability(
    selectedBomId,
    watchWarehouseId,
    watchQuantity,
  )
  const availability = availabilityData?.materials
  const estimatedTotalCost = availabilityData?.estimatedTotalCost ?? 0
  const estimatedUnitCost = availabilityData?.estimatedUnitCost ?? 0

  const allAvailable = availability?.every((m) => m.isAvailable) ?? false
  const canExecute = allAvailable && !!selectedBomId && !!watchWarehouseId && watchQuantity > 0

  // 품목 선택 시
  const handleItemChange = (itemId: string | null) => {
    if (!itemId) return
    setSelectedItemId(itemId)
    form.setValue('product_item_id', itemId)
    setSelectedBomId('')
    form.setValue('bom_header_id', '')
  }

  // BOM 선택 시
  const handleBomChange = (bomId: string | null) => {
    if (!bomId) return
    setSelectedBomId(bomId)
    form.setValue('bom_header_id', bomId)
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await executeAssembly.mutateAsync(data)
      const productName = (selectedItem as any)?.name ?? ''
      toast.success(`${productName} ${data.quantity}개 조립 완료`)
      router.push(`/assembly-orders/${result.data.order_id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '조립 실행 실패')
    }
  })

  return (
    <div>
      <PageHeader title="조립 생성" />
      <form onSubmit={onSubmit}>
        <Card className="border-[#E0D8CF]">
          <CardContent className="pt-6 space-y-6">
            {/* 헤더 폼 */}
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-1.5">
                <Label>조립번호 *</Label>
                <Input {...form.register('order_number')} placeholder="ASM-2026-001" />
                {form.formState.errors.order_number && (
                  <p className="text-xs text-[#B83A2A]">{form.formState.errors.order_number.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>조립일 *</Label>
                <Input type="date" {...form.register('assembly_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>결과 품목 *</Label>
                {itemsLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (assemblyItems ?? []).length === 0 ? (
                  <p className="text-xs text-[#6B6158] py-2">
                    조립 가능 품목이 없습니다. 품목에 BOM을 먼저 등록해주세요.
                  </p>
                ) : (
                  <Select value={selectedItemId || undefined} onValueChange={handleItemChange}>
                    <SelectTrigger><SelectValue placeholder="품목 선택" /></SelectTrigger>
                    <SelectContent>
                      {(assemblyItems ?? []).map((item: any) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {form.formState.errors.product_item_id && (
                  <p className="text-xs text-[#B83A2A]">{form.formState.errors.product_item_id.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>BOM 버전 *</Label>
                <Select
                  value={selectedBomId || undefined}
                  onValueChange={handleBomChange}
                  disabled={activeBoms.length === 0}
                >
                  <SelectTrigger><SelectValue placeholder="BOM 선택" /></SelectTrigger>
                  <SelectContent>
                    {activeBoms.map((bom: any) => (
                      <SelectItem key={bom.id} value={bom.id}>
                        버전 {bom.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.bom_header_id && (
                  <p className="text-xs text-[#B83A2A]">{form.formState.errors.bom_header_id.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>조립 창고 *</Label>
                <Select
                  value={watchWarehouseId || undefined}
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
                <Label>조립 수량 *</Label>
                <Input
                  type="number"
                  step="any"
                  min="0.0001"
                  {...form.register('quantity', { valueAsNumber: true })}
                  className="font-data"
                />
                {form.formState.errors.quantity && (
                  <p className="text-xs text-[#B83A2A]">{form.formState.errors.quantity.message}</p>
                )}
              </div>
            </div>

            {/* 재료 가용성 사전확인 테이블 */}
            {selectedBomId && watchWarehouseId && watchQuantity > 0 && (
              <div>
                <h2 className="font-heading font-semibold text-[15px] mb-3">재료 가용성 확인</h2>
                <div className="border border-[#E0D8CF] rounded-[8px] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F5F0EB]/50">
                        <TableHead className="text-xs font-medium text-[#6B6158]">재료 품목</TableHead>
                        <TableHead className="text-xs font-medium text-[#6B6158] text-right">필요 수량</TableHead>
                        <TableHead className="text-xs font-medium text-[#6B6158] text-right">현재고</TableHead>
                        <TableHead className="text-xs font-medium text-[#6B6158] text-center">가용 여부</TableHead>
                        <TableHead className="text-xs font-medium text-[#6B6158] text-right">부족량</TableHead>
                        <TableHead className="text-xs font-medium text-[#6B6158] text-right">예상 원가</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        availability?.map((m) => (
                          <TableRow
                            key={m.materialItemId}
                            className={m.isAvailable ? '' : 'bg-[#B83A2A]/5'}
                          >
                            <TableCell className="text-[13px]">
                              <span className="font-data">{m.materialItem.code}</span>
                              <span className="text-[#6B6158] ml-1">{m.materialItem.name}</span>
                            </TableCell>
                            <TableCell className="text-[13px] font-data text-right">
                              {formatQty(m.requiredQty, m.materialItem.unit)}
                            </TableCell>
                            <TableCell className="text-[13px] font-data text-right">
                              {formatQty(m.currentStock, m.materialItem.unit)}
                            </TableCell>
                            <TableCell className="text-center">
                              {m.isAvailable ? (
                                <CheckCircle2 className="h-4 w-4 text-[#2B7A6F] inline-block" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-[#B83A2A] inline-block" />
                              )}
                            </TableCell>
                            <TableCell className="text-[13px] font-data text-right">
                              {m.shortage > 0 ? (
                                <span className="text-[#B83A2A]">{formatQty(m.shortage, m.materialItem.unit)}</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-[13px] font-data text-right">
                              {m.isAvailable ? formatAmount(m.estimatedCost) : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {availability && !allAvailable && (
                  <p className="text-xs text-[#B83A2A] mt-2">
                    재료가 부족하여 조립을 실행할 수 없습니다.
                  </p>
                )}
                {availability && allAvailable && estimatedTotalCost > 0 && (
                  <div className="mt-3 flex gap-6 items-center px-1">
                    <div>
                      <span className="text-xs text-[#6B6158]">예상 총원가</span>
                      <span className="ml-2 text-sm font-data font-semibold text-[#D4642A]">
                        {formatAmount(estimatedTotalCost)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-[#6B6158]">예상 단위원가</span>
                      <span className="ml-2 text-sm font-data font-semibold">
                        {formatUnitPrice(estimatedUnitCost)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
              <Button
                type="submit"
                disabled={!canExecute || executeAssembly.isPending}
                className="bg-[#D4642A] hover:bg-[#BF5520]"
              >
                {executeAssembly.isPending ? '조립 처리 중...' : '조립 실행'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
