'use client'

import { useState, useCallback, Fragment } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api/error'
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
import { StatusBadge } from '@/components/common/status-badge'
import { formatQty, formatDate } from '@/lib/format'
import {
  useBomList,
  useDeleteBom,
  useActivateBom,
  useCreateBomVersion,
  type BomFilters,
} from '@/hooks/use-bom'

export default function BomContent() {
  const [filters, setFilters] = useState<BomFilters>({ page: 1, pageSize: 20 })
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const { data, isLoading } = useBomList(filters)
  const deleteBom = useDeleteBom()
  const activateBom = useActivateBom()
  const createVersion = useCreateBomVersion()

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

  const handleToggleActive = async (bomId: string, productItemId: string, currentActive: boolean) => {
    try {
      if (currentActive) {
        await deleteBom.mutateAsync({ id: bomId, productItemId })
        toast.success('BOM 비활성화 완료')
      } else {
        await activateBom.mutateAsync({ id: bomId, productItemId })
        toast.success('BOM 활성화 완료')
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, '상태 변경 실패'))
    }
  }

  const handleNewVersion = async (sourceBomId: string, productItemId: string) => {
    try {
      const result = await createVersion.mutateAsync({ sourceBomId, productItemId })
      toast.success(`새 버전 v${result.version} 생성 완료`)
    } catch (err) {
      toast.error(extractErrorMessage(err, '새 버전 생성 실패'))
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
          placeholder="결과품목 검색..."
        />
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, status: !v || v === 'all' ? undefined : v as BomFilters['status'], page: 1 }))}
          items={{ all: '전체 상태', active: '활성', inactive: '비활성' }}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="전체 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="active">활성</SelectItem>
            <SelectItem value="inactive">비활성</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead className="w-10"></TableHead>
              <TableHead className="sticky left-0 bg-background/50 z-10">결과품목</TableHead>
              <TableHead>버전</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>재료 수</TableHead>
              <TableHead className="hidden md:table-cell">수정일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    title="BOM이 없습니다"
                    description="조립 품목의 자재명세서를 등록하세요"
                    actionLabel="첫 BOM 생성하기"
                    actionHref="/bom/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((bom: any) => {
                const isExpanded = expandedIds.has(bom.id)
                const productItem = bom.product_item
                return (
                  <Fragment key={bom.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-background/30 h-9"
                      tabIndex={0}
                      aria-label={`BOM ${productItem?.code} v${bom.version} ${isExpanded ? '접기' : '펼치기'}`}
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpand(bom.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(bom.id) } }}
                    >
                      <TableCell className="w-10 px-2">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        }
                      </TableCell>
                      <TableCell className="sticky left-0 bg-surface z-10">
                        <span className="font-data font-medium">{productItem?.code}</span>
                        <span className="text-text-secondary ml-2">{productItem?.name}</span>
                      </TableCell>
                      <TableCell className="font-data">v{bom.version}</TableCell>
                      <TableCell>
                        {bom.is_active
                          ? <StatusBadge status="confirmed" />
                          : <StatusBadge status="cancelled" />
                        }
                      </TableCell>
                      <TableCell className="font-data">{bom.bom_lines?.length ?? 0}</TableCell>
                      <TableCell className="font-data hidden md:table-cell">{formatDate(bom.updated_at)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {bom.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => handleNewVersion(bom.id, bom.product_item_id)}
                              disabled={createVersion.isPending}
                              aria-label="새 버전 생성"
                            >
                              새 버전
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`text-xs h-7 px-2 ${bom.is_active ? 'text-destructive' : 'text-secondary'}`}
                            onClick={() => handleToggleActive(bom.id, bom.product_item_id, bom.is_active)}
                            disabled={deleteBom.isPending || activateBom.isPending}
                            aria-label={bom.is_active ? '비활성화' : '활성화'}
                          >
                            {bom.is_active ? '비활성화' : '활성화'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* 아코디언: 재료 목록 */}
                    {isExpanded && (
                      <TableRow className="bg-background/20">
                        <TableCell colSpan={7} className="p-0">
                          <div className="px-8 py-3">
                            {bom.bom_lines && bom.bom_lines.length > 0 ? (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-muted-foreground border-b border-border">
                                    <th className="text-left py-1.5 font-medium">코드</th>
                                    <th className="text-left py-1.5 font-medium">재료 품목</th>
                                    <th className="text-left py-1.5 font-medium">단위</th>
                                    <th className="text-right py-1.5 font-medium">수량</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bom.bom_lines.map((line: any) => (
                                    <tr key={line.id} className="border-b border-border/50 last:border-0">
                                      <td className="py-1.5 font-data">{line.material_item?.code}</td>
                                      <td className="py-1.5">{line.material_item?.name}</td>
                                      <td className="py-1.5 text-text-secondary">{line.material_item?.unit}</td>
                                      <td className="py-1.5 font-data text-right">
                                        {formatQty(line.quantity, line.material_item?.unit)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-xs text-muted-foreground py-2">재료가 없습니다</p>
                            )}
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
