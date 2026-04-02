'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { SearchInput } from '@/components/common/search-input'
import { EmptyState } from '@/components/common/empty-state'
import { DataTablePagination } from '@/components/common/data-table-pagination'
import { useItems, type ItemFilters } from '@/hooks/use-items'

export default function ItemsContent() {
  const router = useRouter()
  const [filters, setFilters] = useState<ItemFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = useItems(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="품목 관리">
        <Button render={<Link href="/items/new" />} className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-1" />
            품목 등록
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="품목코드, 품목명 검색..."
        />
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead className="sticky left-0 z-20 bg-background w-[120px] min-w-[120px]">코드</TableHead>
              <TableHead className="min-w-[200px]">품목명</TableHead>
              <TableHead className="min-w-[140px]">카테고리</TableHead>
              <TableHead className="text-center w-[100px]">조립가능여부</TableHead>
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
                    title="품목이 없습니다"
                    actionLabel="첫 품목 등록하기"
                    actionHref="/items/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((item: any) => {
                const isAssembly = item.item_type === 'assembly'
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-background/30 h-9"
                    tabIndex={0}
                    aria-label={`품목 ${item.code} ${item.name} 상세보기`}
                    onClick={() => router.push(`/items/${item.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/items/${item.id}`) }}
                  >
                    <TableCell className="font-data font-medium sticky left-0 z-10 bg-card w-[120px] min-w-[120px]">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-text-secondary">{item.category || '-'}</TableCell>
                    <TableCell className="text-center">
                      {isAssembly
                        ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-secondary/10 text-secondary font-semibold text-xs">Y</span>
                        : <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-muted/50 text-muted-foreground font-medium text-xs">N</span>
                      }
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && (
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
