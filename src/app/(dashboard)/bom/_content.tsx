'use client'

import { useState, useCallback, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, ChevronDown, Pencil, X, Save, Search, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { SearchInput } from '@/components/common/search-input'
import { EmptyState } from '@/components/common/empty-state'
import { DataTablePagination } from '@/components/common/data-table-pagination'
import { formatQty } from '@/lib/format'
import { extractErrorMessage } from '@/lib/api/error'
import { useBomItemList, useBomByItem, useUpdateBomLines, type BomFilters } from '@/hooks/use-bom'
import { useItemSearch } from '@/hooks/use-items'

// material_type 배지 스타일
const typeStyles: Record<string, string> = {
  'Finished Good': 'border-[1.5px] border-secondary text-secondary bg-transparent',
  'WIP': 'border-[1.5px] border-info text-info bg-transparent',
  'Raw Material': 'border-[1.5px] border-muted-foreground text-text-secondary bg-transparent',
  'Assemble Labor': 'border-[1.5px] border-warning text-warning bg-transparent',
  'Freight Overhead': 'border-[1.5px] border-primary text-primary bg-transparent',
}

function MaterialTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-muted-foreground">-</span>
  return (
    <Badge variant="outline" className={`rounded-sm font-medium text-xs px-2 py-0.5 whitespace-nowrap ${typeStyles[type] ?? typeStyles['Raw Material']}`}>
      {type}
    </Badge>
  )
}

// 편집용 라인 타입
type EditLine = {
  id?: string // 기존 라인은 id 있음, 새로 추가된 건 없음
  material_item_id: string
  quantity: number
  sort_order: number
  name: string
  code: string
  unit: string
  material_type: string | null
  isNew?: boolean // 새로 추가된 라인
  isRemoved?: boolean // 삭제 예정
  originalQuantity?: number // 원래 수량 (변경 감지용)
}

export default function BomContent() {
  const [filters, setFilters] = useState<BomFilters>({ page: 1, pageSize: 50 })
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [expandedSubIds, setExpandedSubIds] = useState<Set<string>>(new Set())
  const { data, isLoading } = useBomItemList(filters)
  const updateBomLines = useUpdateBomLines()

  // 편집 상태
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editedLines, setEditedLines] = useState<EditLine[]>([])
  const [qtyErrors, setQtyErrors] = useState<Record<string, boolean>>({})
  const [materialSearch, setMaterialSearch] = useState('')
  const { data: materialResults } = useItemSearch(materialSearch)

  // dirty 상태 계산
  const isDirty = editingItemId !== null && editedLines.some(
    (l) => l.isNew || l.isRemoved || (l.originalQuantity !== undefined && l.quantity !== l.originalQuantity)
  )

  // 네비게이션 이탈 경고
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  const toggleExpand = (id: string) => {
    // 편집 중인 BOM이 있으면 먼저 확인
    if (editingItemId && editingItemId !== id && isDirty) {
      if (!confirm('저장하지 않은 변경사항이 있습니다. 편집을 취소하시겠습니까?')) return
      cancelEdit()
    }
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSubExpand = (id: string) => {
    setExpandedSubIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 편집 시작
  const startEdit = (item: any) => {
    if (editingItemId && isDirty) {
      if (!confirm('저장하지 않은 변경사항이 있습니다. 편집을 취소하시겠습니까?')) return
    }
    const bom = item.activeBom
    if (!bom) return

    // 현재 BOM 라인을 편집용으로 복사
    const lines: EditLine[] = bom.bom_lines.map((line: any) => ({
      id: line.id,
      material_item_id: line.material_item?.id ?? line.material_item_id,
      quantity: line.quantity,
      sort_order: line.sort_order ?? 0,
      name: line.material_item?.name ?? '',
      code: line.material_item?.code ?? '',
      unit: line.material_item?.unit ?? '',
      material_type: line.material_item?.material_type ?? null,
      originalQuantity: line.quantity,
    }))

    setEditingItemId(item.id)
    setEditedLines(lines)
    setQtyErrors({})
    setMaterialSearch('')

    // 펼치기
    setExpandedIds((prev) => new Set(prev).add(item.id))
  }

  // 편집 취소
  const cancelEdit = () => {
    setEditingItemId(null)
    setEditedLines([])
    setQtyErrors({})
    setMaterialSearch('')
  }

  // 수량 변경
  const updateQuantity = (materialItemId: string, value: string) => {
    const num = parseFloat(value)
    const invalid = isNaN(num) || num <= 0
    setQtyErrors((prev) => ({ ...prev, [materialItemId]: invalid }))
    setEditedLines((prev) =>
      prev.map((l) => l.material_item_id === materialItemId && !l.isRemoved
        ? { ...l, quantity: invalid ? 0 : num }
        : l
      )
    )
  }

  // 재료 추가
  const addMaterial = (mat: { id: string; code: string; name: string; unit: string }) => {
    if (!editingItemId) return
    // 순환참조 방지
    if (mat.id === editingItemId) {
      toast.error('결과품목을 자신의 재료로 추가할 수 없습니다')
      return
    }
    // 중복 방지 (삭제되지 않은 라인 중)
    if (editedLines.some((l) => l.material_item_id === mat.id && !l.isRemoved)) {
      toast.error('이미 추가된 재료입니다')
      return
    }
    const maxSort = Math.max(0, ...editedLines.map((l) => l.sort_order))
    setEditedLines((prev) => [...prev, {
      material_item_id: mat.id,
      quantity: 1,
      sort_order: maxSort + 1,
      name: mat.name,
      code: mat.code,
      unit: mat.unit,
      material_type: null,
      isNew: true,
      originalQuantity: undefined,
    }])
    setMaterialSearch('')
  }

  // 재료 삭제
  const removeMaterial = (materialItemId: string) => {
    setEditedLines((prev) =>
      prev.map((l) => {
        if (l.material_item_id !== materialItemId) return l
        // 새로 추가된 라인은 바로 제거
        if (l.isNew) return { ...l, isRemoved: true }
        // 기존 라인은 삭제 표시
        return { ...l, isRemoved: true }
      })
    )
    setQtyErrors((prev) => {
      const next = { ...prev }
      delete next[materialItemId]
      return next
    })
  }

  // 저장
  const handleSave = async (item: any) => {
    const bom = item.activeBom
    if (!bom) return

    const hasError = Object.values(qtyErrors).some(Boolean)
    const activeLines = editedLines.filter((l) => !l.isRemoved)
    if (activeLines.some((l) => l.quantity <= 0)) {
      toast.error('수량을 올바르게 입력해주세요')
      return
    }
    if (hasError) {
      toast.error('수량을 올바르게 입력해주세요')
      return
    }
    if (activeLines.length === 0) {
      toast.error('최소 1개의 재료가 필요합니다')
      return
    }

    try {
      await updateBomLines.mutateAsync({
        bomHeaderId: bom.id,
        itemId: item.id,
        lines: activeLines.map((l, idx) => ({
          material_item_id: l.material_item_id,
          quantity: l.quantity,
          sort_order: idx,
        })),
      })
      toast.success('BOM 수정 완료')
      cancelEdit()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'BOM 수정 실패'))
    }
  }

  return (
    <div>
      <PageHeader title="BOM 관리">
        <Button render={<Link href="/bom/new" />} className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-1" />
          BOM 생성
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="품목 검색..."
        />
        <Select
          value={filters.materialType ?? 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, materialType: !v || v === 'all' ? undefined : v, page: 1 }))}
          items={{ all: '전체 유형', 'Finished Good': 'Finished Good', 'WIP': 'WIP', 'Raw Material': 'Raw Material', 'Assemble Labor': 'Assemble Labor', 'Freight Overhead': 'Freight Overhead' }}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="전체 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="Finished Good">Finished Good</SelectItem>
            <SelectItem value="WIP">WIP</SelectItem>
            <SelectItem value="Raw Material">Raw Material</SelectItem>
            <SelectItem value="Assemble Labor">Assemble Labor</SelectItem>
            <SelectItem value="Freight Overhead">Freight Overhead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="sticky left-0 bg-background/50 z-10 w-[20%]">Material</TableHead>
              <TableHead className="w-[20%]">Material Type</TableHead>
              <TableHead>Material Describe</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    title="조립 가능한 품목이 없습니다"
                    description="BOM이 등록된 품목만 표시됩니다"
                    actionLabel="BOM 생성"
                    actionHref="/bom/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((item: any) => {
                const isExpanded = expandedIds.has(item.id)
                const isEditing = editingItemId === item.id
                return (
                  <Fragment key={item.id}>
                    <TableRow
                      className="h-9 cursor-pointer hover:bg-background/30"
                      tabIndex={0}
                      aria-label={`${item.name} BOM 구성 ${isExpanded ? '접기' : '펼치기'}`}
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpand(item.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(item.id) } }}
                    >
                      <TableCell className="w-8 px-2">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        }
                      </TableCell>
                      <TableCell className="sticky left-0 bg-surface z-10">
                        <span className="font-medium">{item.name}</span>
                      </TableCell>
                      <TableCell>
                        <MaterialTypeBadge type={item.material_type} />
                      </TableCell>
                      <TableCell className="text-text-secondary text-cell">
                        {item.description || '-'}
                      </TableCell>
                      <TableCell>
                        {item.activeBom && !isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            aria-label={`${item.name} BOM 편집`}
                            onClick={(e) => { e.stopPropagation(); startEdit(item) }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* BOM 구성품 */}
                    {isExpanded && item.activeBom && (
                      <TableRow className="bg-background/20">
                        <TableCell colSpan={5} className="p-0">
                          {isEditing ? (
                            <EditableBomLines
                              item={item}
                              lines={editedLines}
                              qtyErrors={qtyErrors}
                              materialSearch={materialSearch}
                              materialResults={materialResults}
                              isPending={updateBomLines.isPending}
                              onUpdateQuantity={updateQuantity}
                              onAddMaterial={addMaterial}
                              onRemoveMaterial={removeMaterial}
                              onMaterialSearchChange={setMaterialSearch}
                              onSave={() => handleSave(item)}
                              onCancel={cancelEdit}
                            />
                          ) : (
                            <ReadOnlyBomLines
                              item={item}
                              expandedSubIds={expandedSubIds}
                              onToggleSubExpand={toggleSubExpand}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.count > data.pageSize && (
        <DataTablePagination
          page={data.page}
          pageSize={data.pageSize}
          totalCount={data.count}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      )}
    </div>
  )
}

// 읽기 전용 BOM 라인
function ReadOnlyBomLines({
  item,
  expandedSubIds,
  onToggleSubExpand,
}: {
  item: any
  expandedSubIds: Set<string>
  onToggleSubExpand: (id: string) => void
}) {
  return (
    <div className="pl-10 pr-4 py-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="w-6"></th>
            <th className="text-left py-1.5 font-medium min-w-[180px]">구성품</th>
            <th className="text-left py-1.5 font-medium w-[140px]">Material Type</th>
            <th className="text-right py-1.5 font-medium w-[80px]">수량</th>
          </tr>
        </thead>
        <tbody>
          {item.activeBom.bom_lines.map((line: any) => {
            const mat = line.material_item
            const matHasBom = mat?.item_type === 'assembly'
            const isSubExpanded = expandedSubIds.has(line.id)

            return (
              <Fragment key={line.id}>
                <tr
                  className={`border-b border-border/50 last:border-0 ${matHasBom ? 'cursor-pointer hover:bg-background/10' : ''}`}
                  onClick={() => matHasBom && onToggleSubExpand(line.id)}
                >
                  <td className="w-6 py-1.5">
                    {matHasBom && (
                      isSubExpanded
                        ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </td>
                  <td className="py-1.5 font-medium">{mat?.name}</td>
                  <td className="py-1.5">
                    <MaterialTypeBadge type={mat?.material_type} />
                  </td>
                  <td className="py-1.5 font-data text-right">
                    {formatQty(line.quantity, mat?.unit)}
                  </td>
                </tr>

                {/* 하위 BOM */}
                {isSubExpanded && matHasBom && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <SubBomLines itemId={mat.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// 편집 모드 BOM 라인
function EditableBomLines({
  item,
  lines,
  qtyErrors,
  materialSearch,
  materialResults,
  isPending,
  onUpdateQuantity,
  onAddMaterial,
  onRemoveMaterial,
  onMaterialSearchChange,
  onSave,
  onCancel,
}: {
  item: any
  lines: EditLine[]
  qtyErrors: Record<string, boolean>
  materialSearch: string
  materialResults: any[] | undefined
  isPending: boolean
  onUpdateQuantity: (materialItemId: string, value: string) => void
  onAddMaterial: (mat: { id: string; code: string; name: string; unit: string }) => void
  onRemoveMaterial: (materialItemId: string) => void
  onMaterialSearchChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const activeLines = lines.filter((l) => !l.isRemoved)

  return (
    <div className="pl-10 pr-4 py-2">
      {/* 재료 검색 */}
      <div className="relative mb-3 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={materialSearch}
            onChange={(e) => onMaterialSearchChange(e.target.value)}
            placeholder="재료 품목 검색하여 추가..."
            className="h-8 pl-8 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        {materialSearch && materialResults && materialResults.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-auto">
            {materialResults.map((mat) => (
              <button
                key={mat.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-background flex justify-between"
                onClick={(e) => { e.stopPropagation(); onAddMaterial(mat) }}
              >
                <span className="font-data">{mat.code}</span>
                <span className="text-text-secondary">{mat.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{mat.unit}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 편집 테이블 */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left py-1.5 font-medium w-[60px]">코드</th>
            <th className="text-left py-1.5 font-medium min-w-[140px]">구성품</th>
            <th className="text-left py-1.5 font-medium w-[140px]">Material Type</th>
            <th className="text-right py-1.5 font-medium w-[100px]">수량</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {activeLines.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center">
                <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">재료가 없습니다. 위 검색창에서 추가하세요.</p>
              </td>
            </tr>
          ) : (
            activeLines.map((line) => {
              const isModified = line.isNew || (line.originalQuantity !== undefined && line.quantity !== line.originalQuantity)
              return (
                <tr
                  key={line.material_item_id}
                  className={`border-b border-border/50 last:border-0 ${line.isNew ? 'bg-green-500/5' : isModified ? 'bg-yellow-500/5' : ''}`}
                >
                  <td className="py-1.5 font-data text-xs text-muted-foreground">{line.code}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      {isModified && (
                        <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${line.isNew ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      )}
                      <span className="font-medium">{line.name}</span>
                    </div>
                  </td>
                  <td className="py-1.5">
                    <MaterialTypeBadge type={line.material_type} />
                  </td>
                  <td className="py-1.5 text-right">
                    <Input
                      type="number"
                      step="any"
                      min="0.0001"
                      defaultValue={line.quantity}
                      onChange={(e) => onUpdateQuantity(line.material_item_id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`h-7 w-20 font-data text-sm text-right ml-auto ${qtyErrors[line.material_item_id] ? 'border-destructive' : ''}`}
                    />
                  </td>
                  <td className="py-1.5 text-center">
                    <button
                      type="button"
                      className="p-1 hover:bg-background rounded"
                      aria-label={`${line.name} 삭제`}
                      onClick={(e) => { e.stopPropagation(); onRemoveMaterial(line.material_item_id) }}
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {/* 저장/취소 버튼 */}
      <div className="flex justify-end gap-2 pt-3 pb-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={(e) => { e.stopPropagation(); onCancel() }}
          disabled={isPending}
        >
          취소
        </Button>
        <Button
          size="sm"
          className="h-8 bg-primary hover:bg-primary-hover"
          onClick={(e) => { e.stopPropagation(); onSave() }}
          disabled={isPending || activeLines.length === 0}
        >
          {isPending ? (
            '저장 중...'
          ) : (
            <><Save className="h-3.5 w-3.5 mr-1" />저장</>
          )}
        </Button>
      </div>
    </div>
  )
}

// 2단계 하위 BOM 컴포넌트 (별도 쿼리)
function SubBomLines({ itemId }: { itemId: string }) {
  const { data: boms, isLoading } = useBomByItem(itemId)
  const activeBom = boms?.find((b: any) => b.is_active)

  if (isLoading) return <div className="pl-16 py-2"><Skeleton className="h-4 w-48" /></div>
  if (!activeBom || !activeBom.bom_lines?.length) return <div className="pl-16 py-2 text-xs text-muted-foreground">BOM 없음</div>

  return (
    <div className="pl-16 pr-4 py-2 bg-background/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border/30">
            <th className="text-left py-1 font-medium min-w-[180px]">구성품</th>
            <th className="text-left py-1 font-medium w-[140px]">Material Type</th>
            <th className="text-right py-1 font-medium w-[80px]">수량</th>
          </tr>
        </thead>
        <tbody>
          {activeBom.bom_lines.map((line: any) => {
            const mat = line.material_item
            return (
              <tr key={line.id} className="border-b border-border/30 last:border-0">
                <td className="py-1">{mat?.name}</td>
                <td className="py-1">
                  <MaterialTypeBadge type={mat?.material_type} />
                </td>
                <td className="py-1 font-data text-right">
                  {formatQty(line.quantity, mat?.unit)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
