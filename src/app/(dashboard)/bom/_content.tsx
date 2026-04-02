'use client'

import { useState, useCallback, Fragment } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useBomItemList, useBomByItem, type BomFilters } from '@/hooks/use-bom'

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


export default function BomContent() {
  const [filters, setFilters] = useState<BomFilters>({ page: 1, pageSize: 50 })
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [expandedSubIds, setExpandedSubIds] = useState<Set<string>>(new Set())
  const { data, isLoading } = useBomItemList(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  const toggleExpand = (id: string) => {
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
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
                    </TableRow>

                    {/* 1단계: BOM 구성품 */}
                    {isExpanded && item.activeBom && (
                      <TableRow className="bg-background/20">
                        <TableCell colSpan={4} className="p-0">
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
                                        onClick={() => matHasBom && toggleSubExpand(line.id)}
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

                                      {/* 2단계: 하위 BOM 구성품 */}
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
