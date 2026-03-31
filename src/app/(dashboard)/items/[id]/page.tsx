'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api/error'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { itemUpdateSchema, type ItemUpdate } from '@/lib/validations/item'
import { formatQty, formatUnitPrice, formatDate } from '@/lib/format'
import { useItem, useUpdateItem, useDeleteItem, useItemSearch } from '@/hooks/use-items'
import { useBomByItem, useCreateBom, useUpdateBomLines } from '@/hooks/use-bom'
import { useInventoryLots } from '@/hooks/use-inventory'

const unitOptions = ['EA', 'BOX', 'PCS', 'SET', 'ROLL', 'SHEET', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'MM']

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const { data: item, isLoading } = useItem(id)
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()

  const form = useForm<ItemUpdate>({
    resolver: zodResolver(itemUpdateSchema),
  })

  const startEdit = () => {
    if (!item) return
    form.reset({
      code: item.code,
      name: item.name,
      category: item.category ?? '',
      unit: item.unit,
      item_type: item.item_type as ItemUpdate['item_type'],
      description: item.description ?? '',
      min_stock_qty: item.min_stock_qty ?? 0,
    })
    setEditing(true)
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await updateItem.mutateAsync({ id, ...data })
      toast.success('품목 수정 완료')
      setEditing(false)
    } catch (err) {
      toast.error(extractErrorMessage(err, '수정 실패'))
    }
  })

  const handleDelete = async () => {
    if (!confirm('이 품목을 비활성화하시겠습니까?')) return
    try {
      await deleteItem.mutateAsync(id)
      toast.success('품목 비활성화 완료')
      router.push('/items')
    } catch (err) {
      toast.error(extractErrorMessage(err, '삭제 실패'))
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="품목 상세" />
        <Card className="border-border">
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!item) return <div className="text-center py-16 text-muted-foreground">품목을 찾을 수 없습니다</div>

  return (
    <div>
      <PageHeader title={editing ? '품목 수정' : `${item.code} — ${item.name}`}>
        {!editing && (
          <>
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="h-4 w-4 mr-1" />수정
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />비활성화
            </Button>
          </>
        )}
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="info">기본정보</TabsTrigger>
          {item.item_type === 'assembly' && <TabsTrigger value="bom">BOM</TabsTrigger>}
          <TabsTrigger value="stock">재고현황</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card className="border-border max-w-2xl">
            <CardContent className="pt-6">
              {editing ? (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>품목코드 *</Label>
                      <Input {...form.register('code')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>품목명 *</Label>
                      <Input {...form.register('name')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>유형</Label>
                      <Select
                        value={form.watch('item_type') ?? 'basic'}
                        onValueChange={(v) => v && form.setValue('item_type', v as ItemUpdate['item_type'])}
                        items={{ basic: '기초', assembly: '조립' }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">기초</SelectItem>
                          <SelectItem value="assembly">조립</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>단위</Label>
                      <Select
                        value={form.watch('unit') ?? 'EA'}
                        onValueChange={(v) => v && form.setValue('unit', v)}
                        items={Object.fromEntries(unitOptions.map((u) => [u, u]))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {unitOptions.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>카테고리</Label>
                      <Input {...form.register('category')} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>최소 재고</Label>
                    <Input type="number" step="any" {...form.register('min_stock_qty', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>설명</Label>
                    <Textarea {...form.register('description')} rows={3} />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setEditing(false)}>취소</Button>
                    <Button type="submit" disabled={updateItem.isPending} className="bg-primary hover:bg-primary-hover">
                      {updateItem.isPending ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                </form>
              ) : (
                <dl className="grid grid-cols-3 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground text-xs mb-1">품목코드</dt>
                    <dd className="font-data font-medium">{item.code}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs mb-1">품목명</dt>
                    <dd className="font-medium">{item.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs mb-1">유형</dt>
                    <dd>{item.item_type === 'assembly' ? '조립' : '기초'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs mb-1">단위</dt>
                    <dd>{item.unit}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs mb-1">카테고리</dt>
                    <dd>{item.category || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs mb-1">최소 재고</dt>
                    <dd className="font-data">{formatQty(item.min_stock_qty ?? 0, item.unit)}</dd>
                  </div>
                  <div className="col-span-3">
                    <dt className="text-muted-foreground text-xs mb-1">설명</dt>
                    <dd className="whitespace-pre-wrap">{item.description || '-'}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {item.item_type === 'assembly' && (
          <TabsContent value="bom">
            <BomTab itemId={id} />
          </TabsContent>
        )}

        <TabsContent value="stock">
          <StockTab itemId={id} unit={item.unit} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// BOM 탭 컴포넌트
function BomTab({ itemId }: { itemId: string }) {
  const { data: boms, isLoading } = useBomByItem(itemId)
  const createBom = useCreateBom()
  const updateBomLines = useUpdateBomLines()
  const [editingBomId, setEditingBomId] = useState<string | null>(null)
  const [newLines, setNewLines] = useState<{ material_item_id: string; quantity: number; materialName?: string }[]>([])
  const [isCreating, setIsCreating] = useState(false)

  // 품목 검색용
  const [materialSearch, setMaterialSearch] = useState('')
  const { data: searchResults } = useItemSearch(materialSearch)

  const addLine = (mat: { id: string; code: string; name: string }) => {
    if (newLines.some((l) => l.material_item_id === mat.id)) return
    setNewLines((prev) => [...prev, {
      material_item_id: mat.id,
      quantity: 1,
      materialName: `${mat.code} — ${mat.name}`,
    }])
    setMaterialSearch('')
  }

  const removeLine = (idx: number) => {
    setNewLines((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleCreateBom = async () => {
    if (newLines.length === 0) { toast.error('최소 1개의 재료를 추가해주세요'); return }
    try {
      await createBom.mutateAsync({
        product_item_id: itemId,
        lines: newLines.map((l) => ({
          material_item_id: l.material_item_id,
          quantity: l.quantity,
          sort_order: 0,
        })),
      })
      toast.success('BOM 생성 완료')
      setIsCreating(false)
      setNewLines([])
    } catch (err) {
      toast.error(extractErrorMessage(err, 'BOM 생성 실패'))
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />

  return (
    <Card className="border-border">
      <CardContent className="pt-6">
        {(!boms || boms.length === 0) && !isCreating ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">BOM이 정의되지 않았습니다</p>
            <Button size="sm" onClick={() => setIsCreating(true)} className="bg-primary hover:bg-primary-hover">
              <Plus className="h-4 w-4 mr-1" />BOM 생성
            </Button>
          </div>
        ) : isCreating ? (
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-[15px]">새 BOM 생성</h3>

            {/* 재료 검색 */}
            <div className="relative">
              <Input
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                placeholder="재료 품목 검색..."
                className="h-9"
              />
              {materialSearch && searchResults && searchResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-auto">
                  {searchResults.map((mat) => (
                    <button
                      key={mat.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-background flex justify-between"
                      onClick={() => addLine(mat)}
                    >
                      <span className="font-data">{mat.code}</span>
                      <span className="text-text-secondary">{mat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 라인 목록 */}
            {newLines.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-background/50">
                    <TableHead>재료 품목</TableHead>
                    <TableHead className="w-32">수량</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newLines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{line.materialName}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          min="0.0001"
                          value={line.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            setNewLines((prev) => prev.map((l, i) => i === idx ? { ...l, quantity: val || 0 } : l))
                          }}
                          className="h-8 w-24 font-data text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeLine(idx)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setIsCreating(false); setNewLines([]) }}>취소</Button>
              <Button size="sm" onClick={handleCreateBom} disabled={createBom.isPending} className="bg-primary hover:bg-primary-hover">
                {createBom.isPending ? '저장 중...' : 'BOM 저장'}
              </Button>
            </div>
          </div>
        ) : (
          // 기존 BOM 표시
          boms?.map((bom: any) => (
            <div key={bom.id} className="mb-6 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading font-semibold text-[15px]">
                  BOM v{bom.version}
                  {!bom.is_active && <span className="text-muted-foreground ml-2">(비활성)</span>}
                </h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-background/50">
                    <TableHead>코드</TableHead>
                    <TableHead>재료 품목명</TableHead>
                    <TableHead>단위</TableHead>
                    <TableHead className="text-right">수량</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bom.bom_lines?.map((line: any) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-data">{line.material_item?.code}</TableCell>
                      <TableCell>{line.material_item?.name}</TableCell>
                      <TableCell className="text-text-secondary">{line.material_item?.unit}</TableCell>
                      <TableCell className="font-data text-right">
                        {formatQty(line.quantity, line.material_item?.unit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// 재고 현황 탭
function StockTab({ itemId, unit }: { itemId: string; unit: string }) {
  const { data: lots, isLoading } = useInventoryLots(itemId)

  if (isLoading) return <Skeleton className="h-40 w-full" />

  return (
    <Card className="border-border">
      <CardContent className="pt-6">
        {!lots || lots.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">재고가 없습니다</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-background/50">
                <TableHead>창고</TableHead>
                <TableHead>입고일</TableHead>
                <TableHead>출처</TableHead>
                <TableHead className="text-right">초기수량</TableHead>
                <TableHead className="text-right">잔여수량</TableHead>
                <TableHead className="text-right">단가</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot: any) => (
                <TableRow key={lot.id}>
                  <TableCell>
                    {lot.warehouse?.code} — {lot.warehouse?.name}
                  </TableCell>
                  <TableCell className="font-data">{formatDate(lot.lot_date)}</TableCell>
                  <TableCell className="text-text-secondary">{lot.source_type}</TableCell>
                  <TableCell className="font-data text-right">{formatQty(lot.initial_qty, unit)}</TableCell>
                  <TableCell className="font-data text-right">{formatQty(lot.remaining_qty, unit)}</TableCell>
                  <TableCell className="font-data text-right">{formatUnitPrice(lot.unit_cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
