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
import { useWarehouses, type WarehouseFilters } from '@/hooks/use-warehouses'

export default function WarehousesContent() {
  const router = useRouter()
  const [filters, setFilters] = useState<WarehouseFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = useWarehouses(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="창고">
        <Button render={<Link href="/warehouses/new" />} className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-1" />
            창고 등록
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="창고명, 주소 검색..."
        />
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead className="sticky left-0 z-20 bg-background min-w-[160px]">창고명</TableHead>
              <TableHead>창고주소</TableHead>
              <TableHead>연락처</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <EmptyState
                    title="창고가 없습니다"
                    actionLabel="첫 창고 등록하기"
                    actionHref="/warehouses/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((wh) => (
                <TableRow
                  key={wh.id}
                  className="cursor-pointer hover:bg-background/30"
                  tabIndex={0}
                  aria-label={`창고 ${wh.name} 상세보기`}
                  onClick={() => router.push(`/warehouses/${wh.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/warehouses/${wh.id}`) }}
                >
                  <TableCell className="font-medium sticky left-0 z-10 bg-card min-w-[160px]">{wh.name}</TableCell>
                  <TableCell className="text-text-secondary">{wh.address || '-'}</TableCell>
                  <TableCell className="text-text-secondary">{wh.contact || '-'}</TableCell>
                </TableRow>
              ))
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
